"use client";

import Link from "next/link";
import { ProductCard } from "@/components/storefront/ProductCard";
import type { Product } from "@/lib/types";

export function ProductGridBlock({
  products,
  columns,
  wishlist,
}: {
  products: Product[];
  columns: number;
  wishlist: string[];
}) {
  const columnClass =
    columns === 2
      ? "grid-cols-2 lg:grid-cols-2"
      : columns === 3
        ? "grid-cols-2 lg:grid-cols-3"
        : "grid-cols-2 lg:grid-cols-4";

  return (
    <div className={`grid gap-x-4 gap-y-9 md:gap-x-6 ${columnClass}`}>
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          wishlisted={wishlist.includes(product.id)}
          priority={index < 2}
          sizes={
            columns === 2
              ? "(max-width: 768px) 50vw, 45vw"
              : "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          }
        />
      ))}
    </div>
  );
}

export function ProductCarouselBlock({
  products,
  wishlist,
}: {
  products: Product[];
  wishlist: string[];
}) {
  return (
    <div className="ht-scroll-x -mx-5 px-5 pb-2 md:-mx-2 md:px-2">
      {products.map((product) => (
        <div key={product.id} className="w-[62vw] sm:w-[42vw] md:w-[30vw] lg:w-[22vw] xl:w-[19rem]">
          <ProductCard
            product={product}
            wishlisted={wishlist.includes(product.id)}
            sizes="(max-width: 640px) 62vw, (max-width: 1024px) 30vw, 20vw"
          />
        </div>
      ))}
    </div>
  );
}

export function ProductChip({
  product,
}: {
  product: { slug: string; name: string; price: number; image?: string | null };
}) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="flex items-center gap-3 rounded-full py-1.5 pl-1.5 pr-4 text-sm transition hover:opacity-80"
      style={{ background: "var(--ht-surface)", border: "1px solid var(--ht-border)" }}
    >
      {product.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.image} alt="" className="h-9 w-9 rounded-full object-cover" loading="lazy" />
      )}
      <span className="truncate">{product.name}</span>
    </Link>
  );
}
