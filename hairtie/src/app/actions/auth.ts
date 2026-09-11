"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { adoptGuestCart } from "@/lib/cart";
import { endSession, getCurrentUser, hashPassword, startSession, verifyPassword } from "@/lib/auth";

export type AuthResult = { ok: boolean; message?: string; redirectTo?: string };

const emailField = z.email("Please enter a valid email address.");
const passwordField = z
  .string()
  .min(8, "Please use at least 8 characters.")
  .max(72, "That password is too long.");

const registerSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(80),
  email: emailField,
  phone: z
    .string()
    .trim()
    .regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, "Please enter a valid 10-digit mobile number.")
    .optional()
    .or(z.literal("")),
  password: passwordField,
});

export async function registerCustomer(input: unknown): Promise<AuthResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Please check your details." };
  }
  const data = parsed.data;
  const email = data.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, notes: true, passwordHash: true } });

  // A newsletter sign-up created a placeholder account with an unusable
  // password; claiming it here turns it into a real login.
  if (existing) {
    const claimable = existing.notes?.includes("newsletter");
    if (!claimable) {
      return { ok: false, message: "An account with this email already exists. Please sign in instead." };
    }
    const user = await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: data.name,
        phone: data.phone || null,
        passwordHash: await hashPassword(data.password),
        lastLoginAt: new Date(),
      },
    });
    await startSession(user);
    await adoptGuestCart(user.id);
    return { ok: true, redirectTo: "/account" };
  }

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email,
      phone: data.phone || null,
      passwordHash: await hashPassword(data.password),
      lastLoginAt: new Date(),
    },
  });

  await startSession(user);
  await adoptGuestCart(user.id);
  return { ok: true, redirectTo: "/account" };
}

const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Please enter your password."),
});

export async function loginCustomer(input: unknown, next?: string): Promise<AuthResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Please check your details." };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  // The same message is returned whether the email or the password was wrong,
  // so this endpoint cannot be used to discover which emails have accounts.
  const invalid = { ok: false as const, message: "That email and password don't match." };
  if (!user) {
    await hashPassword(parsed.data.password); // keep the timing similar
    return invalid;
  }
  if (user.status === "BLOCKED") {
    return { ok: false, message: "This account has been disabled. Please contact us." };
  }
  if (!(await verifyPassword(parsed.data.password, user.passwordHash))) return invalid;

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await startSession(user);
  await adoptGuestCart(user.id);

  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
  const fallback = user.role === "CUSTOMER" ? "/account" : "/admin";
  return { ok: true, redirectTo: safeNext ?? fallback };
}

export async function logout(): Promise<AuthResult> {
  await endSession();
  return { ok: true, redirectTo: "/" };
}

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
});

export async function updateProfile(input: unknown): Promise<AuthResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Please sign in again." };

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Please check your details." };

  await prisma.user.update({
    where: { id: user.id },
    data: { name: parsed.data.name, phone: parsed.data.phone || null },
  });
  return { ok: true, message: "Your details have been saved." };
}

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordField,
});

export async function changePassword(input: unknown): Promise<AuthResult> {
  const current = await getCurrentUser();
  if (!current) return { ok: false, message: "Please sign in again." };

  const parsed = passwordChangeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Please check your details." };
  }

  const user = await prisma.user.findUnique({ where: { id: current.id } });
  if (!user || !(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
    return { ok: false, message: "Your current password is not correct." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });
  return { ok: true, message: "Your password has been changed." };
}

const addressSchema = z.object({
  label: z.string().trim().max(30).optional().or(z.literal("")),
  fullName: z.string().trim().min(2).max(80),
  phone: z.string().trim().regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, "Enter a valid mobile number."),
  line1: z.string().trim().min(5).max(160),
  line2: z.string().trim().max(160).optional().or(z.literal("")),
  city: z.string().trim().min(2).max(60),
  state: z.string().trim().min(2).max(60),
  pincode: z.string().trim().regex(/^\d{6}$/, "Enter a valid 6-digit pincode."),
  isDefault: z.boolean().optional(),
});

export async function saveAddress(input: unknown, addressId?: string): Promise<AuthResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Please sign in again." };

  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Please check the address." };
  }
  const data = parsed.data;

  if (data.isDefault) {
    await prisma.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
  }

  if (addressId) {
    const owned = await prisma.address.findFirst({ where: { id: addressId, userId: user.id } });
    if (!owned) return { ok: false, message: "That address no longer exists." };
    await prisma.address.update({
      where: { id: addressId },
      data: { ...data, label: data.label || "Home", line2: data.line2 || null },
    });
  } else {
    await prisma.address.create({
      data: {
        ...data,
        label: data.label || "Home",
        line2: data.line2 || null,
        userId: user.id,
      },
    });
  }

  return { ok: true, message: "Address saved." };
}

export async function deleteAddress(addressId: string): Promise<AuthResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Please sign in again." };
  const owned = await prisma.address.findFirst({ where: { id: addressId, userId: user.id } });
  if (!owned) return { ok: false, message: "That address no longer exists." };
  await prisma.address.delete({ where: { id: addressId } });
  return { ok: true, message: "Address removed." };
}
