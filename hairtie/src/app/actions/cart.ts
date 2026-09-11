"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mutate, now } from "@/lib/store";
import { productById } from "@/lib/catalog";
import { ensureCart, evaluateCoupon, getCart, newCartItem } from "@/lib/cart";

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

  const product = productById(productId);
  if (!product || product.status !== "ACTIVE") {
    return { ok: false, message: "This product is no longer available." };
  }

  let available = product.trackInventory ? product.stock : Number.MAX_SAFE_INTEGER;
  if (variantId) {
    const variant = product.variants.find((entry) => entry.id === variantId);
    if (!variant || !variant.isActive) {
      return { ok: false, message: "Please choose an available option." };
    }
    available = product.trackInventory ? variant.stock : Number.MAX_SAFE_INTEGER;
  }

  const { cart } = await ensureCart();
  const existing = cart.items.find(
    (item) => item.productId === productId && item.variantId === (variantId ?? null),
  );
  const nextQuantity = (existing?.quantity ?? 0) + quantity;

  if (!product.allowBackorder && product.trackInventory && nextQuantity > available) {
    if (available <= 0) return { ok: false, message: "Sorry, this is out of stock." };
    return { ok: false, message: `Only ${available} left in stock.` };
  }

  mutate((data) => {
    const target = data.carts.find((entry) => entry.token === cart.token);
    if (!target) return;
    const item = target.items.find(
      (entry) => entry.productId === productId && entry.variantId === (variantId ?? null),
    );
    if (item) {
      item.quantity = nextQuantity;
      item.savedForLater = false;
    } else {
      target.items.push(newCartItem(productId, variantId ?? null, quantity));
    }
    target.updatedAt = now();
  });

  revalidatePath("/", "layout");
  return { ok: true, message: `${product.name} added to your bag.` };
}

async function withItem(
  itemId: string,
  change: (context: { cartToken: string }) => ActionResult,
): Promise<ActionResult> {
  const resolved = await getCart();
  const line = resolved?.lines.find((entry) => entry.item.id === itemId);
  if (!resolved || !line) return { ok: false, message: "That item is no longer in your bag." };
  const result = change({ cartToken: resolved.cart.token });
  revalidatePath("/", "layout");
  return result;
}

export async function updateCartItem(itemId: string, quantity: number): Promise<ActionResult> {
  const resolved = await getCart();
  const line = resolved?.lines.find((entry) => entry.item.id === itemId);
  if (!resolved || !line) return { ok: false, message: "That item is no longer in your bag." };

  if (quantity <= 0) return removeCartItem(itemId);

  const available = line.product.trackInventory
    ? (line.variant?.stock ?? line.product.stock)
    : Number.MAX_SAFE_INTEGER;
  if (quantity > available) return { ok: false, message: `Only ${available} available.` };

  return withItem(itemId, ({ cartToken }) => {
    mutate((data) => {
      const item = data.carts
        .find((entry) => entry.token === cartToken)
        ?.items.find((entry) => entry.id === itemId);
      if (item) item.quantity = Math.min(quantity, 20);
    });
    return { ok: true };
  });
}

export async function removeCartItem(itemId: string): Promise<ActionResult> {
  return withItem(itemId, ({ cartToken }) => {
    mutate((data) => {
      const cart = data.carts.find((entry) => entry.token === cartToken);
      if (cart) cart.items = cart.items.filter((item) => item.id !== itemId);
    });
    return { ok: true, message: "Removed from your bag." };
  });
}

export async function setSavedForLater(itemId: string, saved: boolean): Promise<ActionResult> {
  return withItem(itemId, ({ cartToken }) => {
    mutate((data) => {
      const item = data.carts
        .find((entry) => entry.token === cartToken)
        ?.items.find((entry) => entry.id === itemId);
      if (item) item.savedForLater = saved;
    });
    return { ok: true, message: saved ? "Saved for later." : "Moved back to your bag." };
  });
}

export async function applyCoupon(code: string): Promise<ActionResult> {
  const resolved = await getCart();
  const active = resolved?.lines.filter((line) => !line.item.savedForLater) ?? [];
  if (!resolved || active.length === 0) return { ok: false, message: "Your bag is empty." };

  const result = evaluateCoupon(code, active);
  if (!result.ok) return { ok: false, message: result.reason };

  mutate((data) => {
    const cart = data.carts.find((entry) => entry.token === resolved.cart.token);
    if (cart) cart.couponCode = result.code;
  });

  revalidatePath("/", "layout");
  return { ok: true, message: `${result.code} applied — ${result.label}.` };
}

export async function removeCoupon(): Promise<ActionResult> {
  const resolved = await getCart();
  if (!resolved) return { ok: false };
  mutate((data) => {
    const cart = data.carts.find((entry) => entry.token === resolved.cart.token);
    if (cart) cart.couponCode = null;
  });
  revalidatePath("/", "layout");
  return { ok: true, message: "Coupon removed." };
}
