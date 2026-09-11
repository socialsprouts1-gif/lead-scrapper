import "server-only";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getSiteSettings, type SiteSettings } from "@/lib/settings";

export const CART_COOKIE = "hairtie_cart";

const cartInclude = {
  items: {
    orderBy: { createdAt: "asc" },
    include: {
      product: { include: { images: { orderBy: { position: "asc" }, take: 1 } } },
      variant: true,
    },
  },
} as const;

export type CartWithItems = NonNullable<Awaited<ReturnType<typeof findCart>>>;
export type CartLine = CartWithItems["items"][number];

async function findCart(where: { token?: string; userId?: string }) {
  if (where.userId) {
    return prisma.cart.findUnique({ where: { userId: where.userId }, include: cartInclude });
  }
  if (where.token) {
    return prisma.cart.findUnique({ where: { token: where.token }, include: cartInclude });
  }
  return null;
}

/** Read-only cart lookup — safe to call from a Server Component. */
export async function getCart() {
  const user = await getCurrentUser();
  if (user) {
    const owned = await findCart({ userId: user.id });
    if (owned) return owned;
  }
  const token = (await cookies()).get(CART_COOKIE)?.value;
  if (!token) return null;
  return findCart({ token });
}

/**
 * Cart lookup that creates one if needed. Only call from a Server Action or
 * Route Handler — it writes a cookie.
 */
export async function ensureCart() {
  const user = await getCurrentUser();
  const store = await cookies();
  let token = store.get(CART_COOKIE)?.value;

  if (user) {
    const owned = await findCart({ userId: user.id });
    if (owned) {
      // Fold an anonymous cart into the signed-in one, then retire the token.
      if (token && token !== owned.token) await mergeGuestCart(token, owned.id);
      return (await findCart({ userId: user.id }))!;
    }
    if (token) {
      const guest = await prisma.cart.findUnique({ where: { token } });
      if (guest && !guest.userId) {
        await prisma.cart.update({ where: { id: guest.id }, data: { userId: user.id } });
        return (await findCart({ userId: user.id }))!;
      }
    }
    const created = await prisma.cart.create({
      data: { token: randomUUID(), userId: user.id },
      include: cartInclude,
    });
    setCartCookie(store, created.token);
    return created;
  }

  if (token) {
    const existing = await findCart({ token });
    if (existing) return existing;
  }
  token = randomUUID();
  const created = await prisma.cart.create({ data: { token }, include: cartInclude });
  setCartCookie(store, token);
  return created;
}

function setCartCookie(store: Awaited<ReturnType<typeof cookies>>, token: string) {
  store.set(CART_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 60,
  });
}

async function mergeGuestCart(guestToken: string, targetCartId: string) {
  const guest = await prisma.cart.findUnique({ where: { token: guestToken }, include: { items: true } });
  if (!guest || guest.id === targetCartId) return;
  for (const item of guest.items) {
    // variantId is nullable, so a compound upsert is not usable here.
    const existing = await prisma.cartItem.findFirst({
      where: { cartId: targetCartId, productId: item.productId, variantId: item.variantId },
    });
    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + item.quantity },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: targetCartId,
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          savedForLater: item.savedForLater,
        },
      });
    }
  }
  await prisma.cart.delete({ where: { id: guest.id } });
}

/** Called after a successful sign-in so the guest cart is not lost. */
export async function adoptGuestCart(userId: string) {
  const store = await cookies();
  const token = store.get(CART_COOKIE)?.value;
  if (!token) return;
  const guest = await prisma.cart.findUnique({ where: { token } });
  if (!guest) return;
  const owned = await prisma.cart.findUnique({ where: { userId } });
  if (owned) {
    await mergeGuestCart(token, owned.id);
    setCartCookie(store, owned.token);
  } else if (!guest.userId) {
    await prisma.cart.update({ where: { id: guest.id }, data: { userId } });
  }
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

export async function evaluateCoupon(
  code: string,
  lines: CartLine[],
  ctx: { userId?: string | null; email?: string | null },
): Promise<CouponResult> {
  const normalised = code.trim().toUpperCase();
  if (!normalised) return { ok: false, reason: "Enter a coupon code." };

  const coupon = await prisma.coupon.findUnique({ where: { code: normalised } });
  if (!coupon || !coupon.isActive) return { ok: false, reason: "That coupon code isn't valid." };

  const now = new Date();
  if (coupon.startsAt > now) return { ok: false, reason: "This coupon isn't active yet." };
  if (coupon.expiresAt && coupon.expiresAt < now) return { ok: false, reason: "This coupon has expired." };
  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit)
    return { ok: false, reason: "This coupon has been fully used." };

  // Only the lines the coupon applies to count towards the discount.
  const eligible = lines.filter((line) => {
    if (coupon.scope === "PRODUCTS") return coupon.productIds.includes(line.productId);
    if (coupon.scope === "CATEGORIES")
      return line.product.categoryId ? coupon.categoryIds.includes(line.product.categoryId) : false;
    return true;
  });
  if (eligible.length === 0)
    return { ok: false, reason: "This coupon doesn't apply to the items in your bag." };

  const cartTotal = lines.reduce((sum, l) => sum + linePrice(l) * l.quantity, 0);
  if (cartTotal < coupon.minOrderValue)
    return {
      ok: false,
      reason: `Add items worth ₹${Math.ceil((coupon.minOrderValue - cartTotal) / 100)} more to use this coupon.`,
    };

  if (coupon.firstOrderOnly) {
    const previous = await prisma.order.count({
      where: {
        status: { notIn: ["CANCELLED"] },
        OR: [
          ...(ctx.userId ? [{ userId: ctx.userId }] : []),
          ...(ctx.email ? [{ customerEmail: ctx.email }] : []),
        ],
      },
    });
    if (previous > 0) return { ok: false, reason: "This coupon is for first orders only." };
  }

  if (ctx.userId && coupon.perUserLimit > 0) {
    const used = await prisma.couponRedemption.count({
      where: { couponId: coupon.id, userId: ctx.userId },
    });
    if (used >= coupon.perUserLimit)
      return { ok: false, reason: "You've already used this coupon." };
  }

  const eligibleTotal = eligible.reduce((sum, l) => sum + linePrice(l) * l.quantity, 0);
  let discount =
    coupon.type === "PERCENT"
      ? Math.round((eligibleTotal * coupon.value) / 100)
      : coupon.value;
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

export async function computeTotals(
  cart: CartWithItems | null,
  settings?: SiteSettings,
): Promise<CartTotals> {
  const config = settings ?? (await getSiteSettings());
  const lines = (cart?.items ?? []).filter((l) => !l.savedForLater);

  const subtotal = lines.reduce((sum, l) => sum + linePrice(l) * l.quantity, 0);
  const mrpTotal = lines.reduce((sum, l) => sum + Math.max(lineMrp(l), linePrice(l)) * l.quantity, 0);
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);

  let discount = 0;
  let couponLabel: string | null = null;
  let couponError: string | null = null;
  let couponCode = cart?.couponCode ?? null;

  if (couponCode && lines.length > 0) {
    const user = await getCurrentUser();
    const result = await evaluateCoupon(couponCode, lines, {
      userId: user?.id ?? null,
      email: user?.email ?? null,
    });
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
  const taxIncluded = lines.reduce((sum, l) => {
    const gross = linePrice(l) * l.quantity;
    const rate = l.product.gstRate || 0;
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
