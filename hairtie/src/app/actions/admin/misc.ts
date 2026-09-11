"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAdminOrNull } from "@/lib/auth";
import type { AdminResult } from "@/app/actions/admin/products";

async function guard() {
  const admin = await getAdminOrNull();
  if (!admin) throw new Error("Not authorised.");
  return admin;
}

/* -------------------------------------------------------------------------- */
/* Reviews                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * A product's rating is the sum of its approved reviews. Recomputing from
 * scratch after every change keeps the counters honest even if something is
 * approved, edited and rejected again.
 */
async function recomputeRating(productId: string) {
  const approved = await prisma.review.findMany({
    where: { productId, status: "APPROVED" },
    select: { rating: true },
  });
  await prisma.product.update({
    where: { id: productId },
    data: {
      reviewCount: approved.length,
      ratingSum: approved.reduce((sum, review) => sum + review.rating, 0),
    },
  });
}

export async function setReviewStatus(
  reviewId: string,
  status: "APPROVED" | "REJECTED" | "PENDING",
): Promise<AdminResult> {
  await guard();
  const review = await prisma.review.update({
    where: { id: reviewId },
    data: { status },
    select: { productId: true },
  });
  await recomputeRating(review.productId);
  revalidatePath("/", "layout");
  const labels = { APPROVED: "published", REJECTED: "hidden", PENDING: "moved back to pending" };
  return { ok: true, message: `Review ${labels[status]}.` };
}

export async function deleteReview(reviewId: string): Promise<AdminResult> {
  await guard();
  const review = await prisma.review.delete({ where: { id: reviewId }, select: { productId: true } });
  await recomputeRating(review.productId);
  revalidatePath("/", "layout");
  return { ok: true, message: "Review deleted." };
}

/* -------------------------------------------------------------------------- */
/* Coupons                                                                    */
/* -------------------------------------------------------------------------- */

const couponSchema = z.object({
  code: z.string().trim().min(3, "Codes need at least 3 characters.").max(30),
  description: z.string().trim().max(200).optional().or(z.literal("")),
  type: z.enum(["PERCENT", "FIXED"]),
  value: z.coerce.number().min(0),
  minOrderValue: z.coerce.number().min(0).optional(),
  maxDiscount: z.union([z.string(), z.number()]).optional(),
  scope: z.enum(["ALL", "PRODUCTS", "CATEGORIES"]),
  productIds: z.array(z.string()).max(200).optional(),
  categoryIds: z.array(z.string()).max(100).optional(),
  firstOrderOnly: z.boolean(),
  usageLimit: z.union([z.string(), z.number()]).optional(),
  perUserLimit: z.coerce.number().int().min(0).max(100),
  expiresAt: z.string().optional().or(z.literal("")),
  isActive: z.boolean(),
});

export async function saveCoupon(input: unknown, couponId?: string): Promise<AdminResult> {
  await guard();
  const parsed = couponSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Please check the discount details." };
  }
  const data = parsed.data;
  const code = data.code.toUpperCase().replace(/\s+/g, "");

  if (data.type === "PERCENT" && data.value > 90) {
    return { ok: false, message: "A percentage discount above 90% is almost certainly a mistake." };
  }

  const existing = await prisma.coupon.findUnique({ where: { code }, select: { id: true } });
  if (existing && existing.id !== couponId) {
    return { ok: false, message: `The code ${code} is already in use.` };
  }

  const maxDiscount = data.maxDiscount ? Math.round(Number(data.maxDiscount) * 100) : null;
  const usageLimit = data.usageLimit ? Math.round(Number(data.usageLimit)) : null;

  const payload = {
    code,
    description: data.description || null,
    type: data.type,
    // Percentages are stored as-is; fixed amounts are stored in paise.
    value: data.type === "PERCENT" ? Math.round(data.value) : Math.round(data.value * 100),
    minOrderValue: Math.round((data.minOrderValue ?? 0) * 100),
    maxDiscount: maxDiscount && maxDiscount > 0 ? maxDiscount : null,
    scope: data.scope,
    productIds: data.scope === "PRODUCTS" ? (data.productIds ?? []) : [],
    categoryIds: data.scope === "CATEGORIES" ? (data.categoryIds ?? []) : [],
    firstOrderOnly: data.firstOrderOnly,
    usageLimit: usageLimit && usageLimit > 0 ? usageLimit : null,
    perUserLimit: data.perUserLimit,
    expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    isActive: data.isActive,
  };

  if (couponId) await prisma.coupon.update({ where: { id: couponId }, data: payload });
  else await prisma.coupon.create({ data: payload });

  revalidatePath("/admin/discounts");
  return { ok: true, message: `Discount ${code} saved.` };
}

export async function deleteCoupon(couponId: string): Promise<AdminResult> {
  await guard();
  await prisma.coupon.delete({ where: { id: couponId } });
  revalidatePath("/admin/discounts");
  return { ok: true, message: "Discount deleted." };
}

export async function toggleCoupon(couponId: string, isActive: boolean): Promise<AdminResult> {
  await guard();
  await prisma.coupon.update({ where: { id: couponId }, data: { isActive } });
  revalidatePath("/admin/discounts");
  return { ok: true, message: isActive ? "Discount switched on." : "Discount switched off." };
}

/* -------------------------------------------------------------------------- */
/* Customers                                                                  */
/* -------------------------------------------------------------------------- */

export async function setCustomerStatus(userId: string, status: "ACTIVE" | "BLOCKED"): Promise<AdminResult> {
  const admin = await guard();
  if (admin.id === userId) return { ok: false, message: "You cannot block your own account." };

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user) return { ok: false, message: "That customer no longer exists." };
  if (user.role !== "CUSTOMER") {
    return { ok: false, message: "Staff accounts cannot be blocked from here." };
  }

  await prisma.user.update({ where: { id: userId }, data: { status } });
  revalidatePath("/admin/customers");
  return { ok: true, message: status === "BLOCKED" ? "Customer blocked." : "Customer unblocked." };
}

export async function saveCustomerNote(userId: string, note: string): Promise<AdminResult> {
  await guard();
  await prisma.user.update({ where: { id: userId }, data: { notes: note.slice(0, 1000) || null } });
  revalidatePath("/admin/customers");
  return { ok: true, message: "Note saved." };
}
