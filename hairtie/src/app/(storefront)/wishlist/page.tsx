import type { Metadata } from "next";
import Link from "next/link";
import { Heart } from "lucide-react";
import { productsByIds } from "@/lib/catalog";
import { getWishlistIds } from "@/lib/wishlist";
import { ProductGridBlock } from "@/components/sections/ProductRow";

export const metadata: Metadata = {
  title: "Wishlist | Hairtie",
  robots: { index: false, follow: true },
};

export default async function WishlistPage() {
  const ids = await getWishlistIds();
  const products = productsByIds(ids).filter((product) => product.status === "ACTIVE");

  if (products.length === 0) {
    return (
      <div className="ht-container py-24 text-center">
        <Heart size={38} strokeWidth={1} className="mx-auto" style={{ color: "var(--ht-muted)" }} />
        <h1 className="mt-5 text-[2rem]">Nothing saved yet</h1>
        <p className="mx-auto mt-2 max-w-sm text-[0.98rem]" style={{ color: "var(--ht-muted)" }}>
          Tap the heart on any product to keep it here. No account needed — your wishlist stays in
          this browser.
        </p>
        <Link href="/shop" className="ht-btn ht-btn-primary mt-7">Browse the shop</Link>
      </div>
    );
  }

  return (
    <div className="ht-container py-10 md:py-14">
      <h1 className="text-[2.1rem] md:text-[2.6rem]">Your wishlist</h1>
      <p className="mt-2 text-[0.98rem]" style={{ color: "var(--ht-muted)" }}>
        {products.length} {products.length === 1 ? "piece" : "pieces"} saved.
      </p>
      <div className="mt-9">
        <ProductGridBlock products={products} columns={4} wishlist={ids} />
      </div>
    </div>
  );
}
