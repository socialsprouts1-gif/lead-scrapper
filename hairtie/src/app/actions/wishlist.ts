"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export type WishlistResult = { ok: boolean; message?: string; requiresLogin?: boolean; active?: boolean };

export async function toggleWishlist(productId: string): Promise<WishlistResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, requiresLogin: true, message: "Sign in to save your favourites." };
  }

  const existing = await prisma.wishlistItem.findUnique({
    where: { userId_productId: { userId: user.id, productId } },
  });

  if (existing) {
    await prisma.wishlistItem.delete({ where: { id: existing.id } });
    revalidatePath("/wishlist");
    return { ok: true, active: false, message: "Removed from your wishlist." };
  }

  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) return { ok: false, message: "That product no longer exists." };

  await prisma.wishlistItem.create({ data: { userId: user.id, productId } });
  revalidatePath("/wishlist");
  return { ok: true, active: true, message: "Saved to your wishlist." };
}

export async function getWishlistIds(): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const rows = await prisma.wishlistItem.findMany({
    where: { userId: user.id },
    select: { productId: true },
  });
  return rows.map((r) => r.productId);
}
