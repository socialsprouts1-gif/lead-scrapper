import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/db";
import type { Role } from "@/generated/prisma/enums";

export const SESSION_COOKIE = "hairtie_session";
const SESSION_DAYS = 30;

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 24) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "AUTH_SECRET must be set to a random string of at least 24 characters in production.",
      );
    }
    // Development convenience only — production throws above.
    return new TextEncoder().encode("hairtie-development-only-secret-key-change-me");
  }
  return new TextEncoder().encode(value);
}

export type SessionPayload = { sub: string; role: Role; name: string };

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT({ role: payload.role, name: payload.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
}

export async function readSessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      role: (payload.role as Role) ?? "CUSTOMER",
      name: (payload.name as string) ?? "",
    };
  } catch {
    return null;
  }
}

export async function startSession(user: { id: string; role: Role; name: string }) {
  const token = await signSession({ sub: user.id, role: user.role, name: user.name });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function endSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Current signed-in user, or null. Deduplicated per request. */
export const getCurrentUser = cache(async () => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await readSessionToken(token);
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { id: true, name: true, email: true, phone: true, role: true, status: true },
  });
  if (!user || user.status === "BLOCKED") return null;
  return user;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/account/login");
  return user;
}

export function isStaff(role: Role | undefined | null) {
  return role === "ADMIN" || role === "STAFF";
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !isStaff(user.role)) redirect("/admin/login");
  return user;
}

/** For API route handlers — returns null instead of redirecting. */
export async function getAdminOrNull() {
  const user = await getCurrentUser();
  return user && isStaff(user.role) ? user : null;
}
