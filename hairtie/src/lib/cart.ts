import "server-only";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { createId, mutate, now, store } from "@/lib/store";
import { productById } from "@/lib/catalog";
import { getSiteSettings } from "@/lib/settings";
import type { SiteSettings } from "@/lib/site-settings";
import type { Cart, CartItem, Product, ProductVariant } from "@/lib/types";

export const CART_COOKIE = "hairtie_cart";

/** A cart row joined with the product and variant it points at. */
export type CartLine = {
  item: CartItem;
  product: Product;
  variant: ProductVariant | null;
};

export type ResolvedCart = {
  cart: Cart;
  lines: CartLine[];
};

function resolveLines(cart: Cart): CartLine[] {
  const lines: CartLine[] = [];
  for (const item of cart.items) {
    const product = productById(item.productId);
    // A product deleted from the admin simply drops out of the bag.
    if (!product) continue;
    const variant = item.variantId
      ? (product.variants.find((entry) => entry.id === item.variantId) ?? null)
      : null;
    if (item.variantId && !variant) continue;
    lines.push({ item, product, variant });
  }
  return lines;
}

/** Read-only cart lookup — safe to call from a Server Component. */
export async function getCart(): Promise<ResolvedCart | null> {
  const token = (await cookies()).get(CART_COOKIE)?.value;
  if (!token) return null;
  const cart = store().carts.find((entry) => entry.token === token);
  if (!cart) return null;
  return { cart, lines: resolveLines(cart) };
}

/**
 * Cart lookup that creates one if needed. Only call from a Server Action or
 * Route Handler — it writes a cookie.
 */
export async function ensureCart(): Promise<ResolvedCart> {
  const jar = await cookies();
  let token = jar.get(CART_COOKIE)?.value;

  let cart = token ? store().carts.find((entry) => entry.token === token) : undefined;

  if (!cart) {
    token = randomUUID();
    cart = { token, couponCode: null, items: [], updatedAt: now() };
    mutate((data) => {
      data.carts.push(cart!);
      // Keep the file small: drop carts nobody has touched in two months.
      const cutoff = Date.now() - 60 * 24 * 60 * 60 * 1000;
      data.carts = data.carts.filter((entry) => new Date(entry.updatedAt).getTime() > cutoff);
    });
    jar.set(CART_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 60,
    });
  }

  return { cart, lines: resolveLines(cart) };
}

/* -------------------------------------------------------------------------- */
/* Pricing                                                                    */
/* -------------------------------------------------------------------------- */

export function linePrice(line: CartLine) {
  return line.variant?.price ?? line.product.price;
}

export function lineMrp(line: CartLine) {
  return line.variant?.mrp ?? line.product.mrp;
}

export function lineStock(line: CartLine) {
  if (!line.product.trackInventory) return Number.MAX_SAFE_INTEGER;
  return line.variant ? line.variant.stock : line.product.stock;
}

export type CouponResult =
  | { ok: true; code: string; discount: number; label: string }
  | { ok: false; reason: string };

export function evaluateCoupon(code: string, lines: CartLine[]): CouponResult {
  const normalised = code.trim().toUpperCase();
  if (!normalised) return { ok: false, reason: "Enter a coupon code." };

  const coupon = store().coupons.find((entry) => entry.code === normalised);
  if (!coupon || !coupon.isActive) return { ok: false, reason: "That coupon code isn't valid." };

  const nowMs = Date.now();
  if (new Date(coupon.startsAt).getTime() > nowMs) {
    return { ok: false, reason: "This coupon isn't active yet." };
  }
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < nowMs) {
    return { ok: false, reason: "This coupon has expired." };
  }
  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
    return { ok: false, reason: "This coupon has been fully used." };
  }

  // Only the lines the coupon applies to count towards the discount.
  const eligible = lines.filter((line) => {
    if (coupon.scope === "PRODUCTS") return coupon.productIds.includes(line.product.id);
    if (coupon.scope === "CATEGORIES") {
      return line.product.categoryId ? coupon.categoryIds.includes(line.product.categoryId) : false;
    }
    return true;
  });
  if (eligible.length === 0) {
    return { ok: false, reason: "This coupon doesn't apply to the items in your bag." };
  }

  const cartTotal = lines.reduce((sum, line) => sum + linePrice(line) * line.item.quantity, 0);
  if (cartTotal < coupon.minOrderValue) {
    return {
      ok: false,
      reason: `Add items worth ₹${Math.ceil((coupon.minOrderValue - cartTotal) / 100)} more to use this coupon.`,
    };
  }

  const eligibleTotal = eligible.reduce((sum, line) => sum + linePrice(line) * line.item.quantity, 0);
  let discount =
    coupon.type === "PERCENT" ? Math.round((eligibleTotal * coupon.value) / 100) : coupon.value;
  if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
  discount = Math.min(discount, eligibleTotal);

  return {
    ok: true,
    code: coupon.code,
    discount,
    label:
      coupon.type === "PERCENT"
        ? `${coupon.value}% off${coupon.maxDiscount ? ` (up to ₹${coupon.maxDiscount / 100})` : ""}`
        : `₹${coupon.value / 100} off`,
  };
}

export type CartTotals = {
  itemCount: number;
  subtotal: number;
  mrpTotal: number;
  discount: number;
  couponCode: string | null;
  couponLabel: string | null;
  couponError: string | null;
  shippingFee: number;
  freeShippingThreshold: number;
  amountToFreeShipping: number;
  taxIncluded: number;
  total: number;
};

export function computeTotals(resolved: ResolvedCart | null, settings?: SiteSettings): CartTotals {
  const config = settings ?? getSiteSettings();
  const lines = (resolved?.lines ?? []).filter((line) => !line.item.savedForLater);

  const subtotal = lines.reduce((sum, line) => sum + linePrice(line) * line.item.quantity, 0);
  const mrpTotal = lines.reduce(
    (sum, line) => sum + Math.max(lineMrp(line), linePrice(line)) * line.item.quantity,
    0,
  );
  const itemCount = lines.reduce((sum, line) => sum + line.item.quantity, 0);

  let discount = 0;
  let couponLabel: string | null = null;
  let couponError: string | null = null;
  let couponCode = resolved?.cart.couponCode ?? null;

  if (couponCode && lines.length > 0) {
    const result = evaluateCoupon(couponCode, lines);
    if (result.ok) {
      discount = result.discount;
      couponLabel = result.label;
    } else {
      couponError = result.reason;
      couponCode = null;
    }
  }

  const payable = Math.max(subtotal - discount, 0);
  const threshold = config.shipping.freeAbovePaise;
  const shippingFee =
    itemCount === 0 || (threshold > 0 && payable >= threshold) ? 0 : config.shipping.flatRatePaise;

  // Listed prices include GST, so tax is shown as the portion already inside the price.
  const taxIncluded = lines.reduce((sum, line) => {
    const gross = linePrice(line) * line.item.quantity;
    const rate = line.product.gstRate || 0;
    return sum + Math.round(gross - gross / (1 + rate / 100));
  }, 0);

  return {
    itemCount,
    subtotal,
    mrpTotal,
    discount,
    couponCode,
    couponLabel,
    couponError,
    shippingFee,
    freeShippingThreshold: threshold,
    amountToFreeShipping: threshold > 0 ? Math.max(threshold - payable, 0) : 0,
    taxIncluded,
    total: payable + shippingFee,
  };
}

export function newCartItem(productId: string, variantId: string | null, quantity: number): CartItem {
  return {
    id: createId("ci"),
    productId,
    variantId,
    quantity,
    savedForLater: false,
    addedAt: now(),
  };
}
