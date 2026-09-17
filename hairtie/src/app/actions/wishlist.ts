"use server";

import { revalidatePath } from "next/cache";
import { productById } from "@/lib/catalog";
import { getWishlistIds, setWishlistIds } from "@/lib/wishlist";

export type WishlistResult = { ok: boolean; message?: string; active?: boolean };

export async function toggleWishlist(productId: string): Promise<WishlistResult> {
  const product = productById(productId);
  if (!product) return { ok: false, message: "That product no longer exists." };

  const current = await getWishlistIds();
  const active = !current.includes(productId);

  await setWishlistIds(
    active ? [productId, ...current] : current.filter((id) => id !== productId),
  );

  revalidatePath("/wishlist");
  return {
    ok: true,
    active,
    message: active ? "Saved to your wishlist." : "Removed from your wishlist.",
  };
}
