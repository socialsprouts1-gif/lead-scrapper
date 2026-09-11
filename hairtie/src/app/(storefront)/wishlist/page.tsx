import type { Metadata } from "next";
import Link from "next/link";
import { Heart } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { PRODUCT_CARD_SELECT } from "@/lib/catalog";
import { ProductGridBlock } from "@/components/sections/ProductRow";

export const metadata: Metadata = {
  title: "Wishlist | Hairtie",
  robots: { index: false, follow: true },
};

export default async function WishlistPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="ht-container py-24 text-center">
        <Heart size={38} strokeWidth={1} className="mx-auto" style={{ color: "var(--ht-muted)" }} />
        <h1 className="mt-5 text-[2rem]">Your wishlist</h1>
        <p className="mx-auto mt-2 max-w-sm text-[0.98rem]" style={{ color: "var(--ht-muted)" }}>
          Sign in to save the pieces you love and find them again later.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/account/login?next=/wishlist" className="ht-btn ht-btn-primary">Sign in</Link>
          <Link href="/account/register" className="ht-btn ht-btn-outline">Create an account</Link>
        </div>
      </div>
    );
  }

  const items = await prisma.wishlistItem.findMany({
    where: { userId: user.id, product: { status: "ACTIVE" } },
    orderBy: { createdAt: "desc" },
    include: { product: { select: PRODUCT_CARD_SELECT } },
  });

  if (items.length === 0) {
    return (
      <div className="ht-container py-24 text-center">
        <Heart size={38} strokeWidth={1} className="mx-auto" style={{ color: "var(--ht-muted)" }} />
        <h1 className="mt-5 text-[2rem]">Nothing saved yet</h1>
        <p className="mx-auto mt-2 max-w-sm text-[0.98rem]" style={{ color: "var(--ht-muted)" }}>
          Tap the heart on any product to keep it here.
        </p>
        <Link href="/shop" className="ht-btn ht-btn-primary mt-7">Browse the shop</Link>
      </div>
    );
  }

  return (
    <div className="ht-container py-10 md:py-14">
      <h1 className="text-[2.1rem] md:text-[2.6rem]">Your wishlist</h1>
      <p className="mt-2 text-[0.98rem]" style={{ color: "var(--ht-muted)" }}>
        {items.length} {items.length === 1 ? "piece" : "pieces"} saved.
      </p>
      <div className="mt-9">
        <ProductGridBlock
          products={items.map((item) => item.product)}
          columns={4}
          wishlist={items.map((item) => item.productId)}
        />
      </div>
    </div>
  );
}
