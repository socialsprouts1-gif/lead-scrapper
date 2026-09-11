"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ensureCart, evaluateCoupon, getCart } from "@/lib/cart";
import { getCurrentUser } from "@/lib/auth";

export type ActionResult = { ok: boolean; message?: string };

const addSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1).nullable().optional(),
  quantity: z.number().int().min(1).max(20).default(1),
});

export async function addToCart(input: {
  productId: string;
  variantId?: string | null;
  quantity?: number;
}): Promise<ActionResult> {
  const parsed = addSchema.safeParse({ ...input, quantity: input.quantity ?? 1 });
  if (!parsed.success) return { ok: false, message: "That item could not be added." };
  const { productId, variantId, quantity } = parsed.data;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, status: true, stock: true, trackInventory: true, allowBackorder: true, name: true },
  });
  if (!product || product.status !== "ACTIVE") {
    return { ok: false, message: "This product is no longer available." };
  }

  let available = product.trackInventory ? product.stock : Number.MAX_SAFE_INTEGER;
  if (variantId) {
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      select: { stock: true, isActive: true, productId: true },
    });
    if (!variant || !variant.isActive || variant.productId !== productId) {
      return { ok: false, message: "Please choose an available option." };
    }
    available = product.trackInventory ? variant.stock : Number.MAX_SAFE_INTEGER;
  }

  const cart = await ensureCart();
  const existing = await prisma.cartItem.findFirst({
    where: { cartId: cart.id, productId, variantId: variantId ?? null },
  });
  const nextQuantity = (existing?.quantity ?? 0) + quantity;

  if (!product.allowBackorder && product.trackInventory && nextQuantity > available) {
    if (available <= 0) return { ok: false, message: "Sorry, this is out of stock." };
    return { ok: false, message: `Only ${available} left in stock.` };
  }

  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: nextQuantity, savedForLater: false },
    });
  } else {
    await prisma.cartItem.create({
      data: { cartId: cart.id, productId, variantId: variantId ?? null, quantity },
    });
  }

  revalidatePath("/", "layout");
  return { ok: true, message: `${product.name} added to your bag.` };
}

async function ownedItem(itemId: string) {
  const cart = await getCart();
  if (!cart) return null;
  return cart.items.find((item) => item.id === itemId) ?? null;
}

export async function updateCartItem(itemId: string, quantity: number): Promise<ActionResult> {
  const item = await ownedItem(itemId);
  if (!item) return { ok: false, message: "That item is no longer in your bag." };

  if (quantity <= 0) {
    await prisma.cartItem.delete({ where: { id: item.id } });
    revalidatePath("/", "layout");
    return { ok: true, message: "Removed from your bag." };
  }

  const available = item.product.trackInventory
    ? (item.variant?.stock ?? item.product.stock)
    : Number.MAX_SAFE_INTEGER;
  if (quantity > available) return { ok: false, message: `Only ${available} available.` };

  await prisma.cartItem.update({ where: { id: item.id }, data: { quantity: Math.min(quantity, 20) } });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeCartItem(itemId: string): Promise<ActionResult> {
  const item = await ownedItem(itemId);
  if (!item) return { ok: false };
  await prisma.cartItem.delete({ where: { id: item.id } });
  revalidatePath("/", "layout");
  return { ok: true, message: "Removed from your bag." };
}

export async function setSavedForLater(itemId: string, saved: boolean): Promise<ActionResult> {
  const item = await ownedItem(itemId);
  if (!item) return { ok: false };
  await prisma.cartItem.update({ where: { id: item.id }, data: { savedForLater: saved } });
  revalidatePath("/", "layout");
  return { ok: true, message: saved ? "Saved for later." : "Moved back to your bag." };
}

export async function applyCoupon(code: string): Promise<ActionResult> {
  const cart = await getCart();
  if (!cart || cart.items.length === 0) return { ok: false, message: "Your bag is empty." };

  const user = await getCurrentUser();
  const result = await evaluateCoupon(
    code,
    cart.items.filter((i) => !i.savedForLater),
    { userId: user?.id ?? null, email: user?.email ?? null },
  );
  if (!result.ok) return { ok: false, message: result.reason };

  await prisma.cart.update({ where: { id: cart.id }, data: { couponCode: result.code } });
  revalidatePath("/", "layout");
  return { ok: true, message: `${result.code} applied — ${result.label}.` };
}

export async function removeCoupon(): Promise<ActionResult> {
  const cart = await getCart();
  if (!cart) return { ok: false };
  await prisma.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
  revalidatePath("/", "layout");
  return { ok: true, message: "Coupon removed." };
}
