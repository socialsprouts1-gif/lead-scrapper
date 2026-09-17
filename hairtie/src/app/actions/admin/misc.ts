"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createId, mutate, now, store } from "@/lib/store";
import type { AdminResult } from "@/app/actions/admin/products";

/* -------------------------------------------------------------------------- */
/* Reviews                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * A product's rating is the sum of its approved reviews. Recomputing from
 * scratch after every change keeps the counters honest even if a review is
 * approved, hidden and approved again.
 */
function recomputeRating(productId: string) {
  mutate((db) => {
    const product = db.products.find((entry) => entry.id === productId);
    if (!product) return;
    const approved = db.reviews.filter(
      (review) => review.productId === productId && review.status === "APPROVED",
    );
    product.reviewCount = approved.length;
    product.ratingSum = approved.reduce((sum, review) => sum + review.rating, 0);
  });
}

export async function setReviewStatus(
  reviewId: string,
  status: "APPROVED" | "REJECTED" | "PENDING",
): Promise<AdminResult> {
  const productId = mutate((db) => {
    const review = db.reviews.find((entry) => entry.id === reviewId);
    if (!review) return null;
    review.status = status;
    return review.productId;
  });
  if (!productId) return { ok: false, message: "That review no longer exists." };

  recomputeRating(productId);
  revalidatePath("/", "layout");
  const labels = { APPROVED: "published", REJECTED: "hidden", PENDING: "moved back to pending" };
  return { ok: true, message: `Review ${labels[status]}.` };
}

export async function deleteReview(reviewId: string): Promise<AdminResult> {
  const productId = mutate((db) => {
    const review = db.reviews.find((entry) => entry.id === reviewId);
    if (!review) return null;
    db.reviews = db.reviews.filter((entry) => entry.id !== reviewId);
    return review.productId;
  });
  if (!productId) return { ok: false, message: "That review no longer exists." };

  recomputeRating(productId);
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
  const parsed = couponSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Please check the discount details." };
  }
  const data = parsed.data;
  const code = data.code.toUpperCase().replace(/\s+/g, "");

  if (data.type === "PERCENT" && data.value > 90) {
    return { ok: false, message: "A percentage discount above 90% is almost certainly a mistake." };
  }
  if (store().coupons.some((coupon) => coupon.code === code && coupon.id !== couponId)) {
    return { ok: false, message: `The code ${code} is already in use.` };
  }

  const maxDiscount = data.maxDiscount ? Math.round(Number(data.maxDiscount) * 100) : null;
  const usageLimit = data.usageLimit ? Math.round(Number(data.usageLimit)) : null;

  mutate((db) => {
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
      expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : null,
      isActive: data.isActive,
    };

    if (couponId) {
      const coupon = db.coupons.find((entry) => entry.id === couponId);
      if (coupon) Object.assign(coupon, payload);
    } else {
      db.coupons.unshift({
        id: createId("cpn"),
        usageCount: 0,
        startsAt: now(),
        createdAt: now(),
        ...payload,
      });
    }
  });

  revalidatePath("/admin/discounts");
  return { ok: true, message: `Discount ${code} saved.` };
}

export async function deleteCoupon(couponId: string): Promise<AdminResult> {
  mutate((db) => {
    db.coupons = db.coupons.filter((coupon) => coupon.id !== couponId);
  });
  revalidatePath("/admin/discounts");
  return { ok: true, message: "Discount deleted." };
}

export async function toggleCoupon(couponId: string, isActive: boolean): Promise<AdminResult> {
  mutate((db) => {
    const coupon = db.coupons.find((entry) => entry.id === couponId);
    if (coupon) coupon.isActive = isActive;
  });
  revalidatePath("/admin/discounts");
  return { ok: true, message: isActive ? "Discount switched on." : "Discount switched off." };
}
