"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Heart, Eye, ShoppingBag } from "lucide-react";
import { addToCart } from "@/app/actions/cart";
import { toggleWishlist } from "@/app/actions/wishlist";
import { useToast } from "@/components/ui/Toast";
import { Price } from "@/components/ui/Price";
import { Spinner } from "@/components/ui/Spinner";
import type { Product } from "@/lib/types";

type Props = {
  product: Product;
  wishlisted?: boolean;
  priority?: boolean;
  onQuickView?: (slug: string) => void;
  sizes?: string;
};

function badgesFor(product: Product) {
  const badges: { label: string; bg: string; color: string }[] = [];
  const active = product.variants.filter((variant) => variant.isActive);
  const stock = !product.trackInventory
    ? Number.MAX_SAFE_INTEGER
    : active.length
      ? active.reduce((sum, variant) => sum + variant.stock, 0)
      : product.stock;

  if (stock <= 0) badges.push({ label: "Sold out", bg: "rgba(47,41,37,0.85)", color: "#fdfaf6" });
  else {
    if (product.isNewArrival) badges.push({ label: "New", bg: "rgba(255,255,255,0.92)", color: "#2f2925" });
    if (product.isBestseller) badges.push({ label: "Bestseller", bg: "rgba(141,106,91,0.92)", color: "#fff" });
    if (product.isTrending) badges.push({ label: "Trending", bg: "rgba(243,217,213,0.95)", color: "#6b3f3a" });
    if (product.isOnSale) badges.push({ label: "Sale", bg: "rgba(138,90,60,0.94)", color: "#fff" });
    if (stock > 0 && stock <= product.lowStockThreshold)
      badges.push({ label: "Limited stock", bg: "rgba(255,255,255,0.92)", color: "#8a5a3c" });
  }
  return badges.slice(0, 2);
}

export function ProductCard({ product, wishlisted = false, priority, onQuickView, sizes }: Props) {
  const { show } = useToast();
  const [saved, setSaved] = useState(wishlisted);
  const [pending, startTransition] = useTransition();
  const [adding, startAdding] = useTransition();

  const image = product.images[0];
  const hoverImage = product.images[1];
  const options = product.variants.filter((variant) => variant.isActive);
  const badges = badgesFor(product);
  const soldOut = badges.some((b) => b.label === "Sold out");
  const needsChoice = options.length > 1;

  function onWishlist(event: React.MouseEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await toggleWishlist(product.id);
      if (result.ok) {
        setSaved(Boolean(result.active));
        show(result.message ?? "");
      } else if (result.message) {
        show(result.message, "error");
      }
    });
  }

  function onAdd(event: React.MouseEvent) {
    event.preventDefault();
    startAdding(async () => {
      const result = await addToCart({ productId: product.id, quantity: 1 });
      show(result.message ?? (result.ok ? "Added to your bag." : "Could not add that."), result.ok ? "default" : "error");
    });
  }

  return (
    <div className="ht-product-card group relative">
      <Link href={`/products/${product.slug}`} className="block">
        <div
          className="ht-product-media relative overflow-hidden"
          style={{ borderRadius: "var(--ht-radius)", background: "var(--ht-surface)", aspectRatio: "4 / 5" }}
        >
          {image ? (
            <>
              <Image
                src={image.url}
                alt={image.alt || product.name}
                fill
                sizes={sizes ?? "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"}
                priority={priority}
                loading={priority ? undefined : "lazy"}
                className="ht-primary-img object-cover"
              />
              {hoverImage && (
                <Image
                  src={hoverImage.url}
                  alt=""
                  fill
                  sizes={sizes ?? "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"}
                  loading="lazy"
                  aria-hidden
                  className="ht-hover-img absolute inset-0 object-cover opacity-0"
                />
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-xs" style={{ color: "var(--ht-muted)" }}>
              No photo yet
            </div>
          )}

          <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5">
            {badges.map((badge) => (
              <span key={badge.label} className="ht-badge" style={{ background: badge.bg, color: badge.color }}>
                {badge.label}
              </span>
            ))}
          </div>

          <button
            type="button"
            onClick={onWishlist}
            disabled={pending}
            aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
            aria-pressed={saved}
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full backdrop-blur transition hover:scale-105"
            style={{ background: "rgba(255,255,255,0.86)", color: saved ? "#b5555f" : "var(--ht-text)" }}
          >
            {pending ? <Spinner size={14} /> : <Heart size={16} strokeWidth={1.6} className={saved ? "fill-current" : ""} />}
          </button>

          {onQuickView && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onQuickView(product.slug);
              }}
              className="absolute inset-x-3 bottom-3 hidden translate-y-2 items-center justify-center gap-2 rounded-full py-2.5 text-xs uppercase tracking-widest opacity-0 backdrop-blur transition group-hover:translate-y-0 group-hover:opacity-100 md:flex"
              style={{ background: "rgba(255,255,255,0.93)", color: "var(--ht-text)" }}
            >
              <Eye size={14} strokeWidth={1.6} /> Quick view
            </button>
          )}
        </div>
      </Link>

      <div className="pt-3.5">
                <h3 className="text-[0.95rem] leading-snug">
          <Link href={`/products/${product.slug}`} className="ht-underline">
            {product.name}
          </Link>
        </h3>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <Price price={product.price} mrp={product.mrp} size="sm" />
          {!soldOut &&
            (needsChoice ? (
              <Link
                href={`/products/${product.slug}`}
                aria-label={`Choose options for ${product.name}`}
                className="hidden h-8 w-8 shrink-0 place-items-center rounded-full transition hover:scale-105 md:grid"
                style={{ background: "var(--ht-secondary)", color: "var(--ht-text)" }}
              >
                <ShoppingBag size={14} strokeWidth={1.7} />
              </Link>
            ) : (
              <button
                type="button"
                onClick={onAdd}
                disabled={adding}
                aria-label={`Add ${product.name} to bag`}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full transition hover:scale-105"
                style={{ background: "var(--ht-secondary)", color: "var(--ht-text)" }}
              >
                {adding ? <Spinner size={13} /> : <ShoppingBag size={14} strokeWidth={1.7} />}
              </button>
            ))}
        </div>
        {options.length > 1 && (
          <div className="mt-2 flex items-center gap-1.5">
            {options.slice(0, 5).map((variant) => (
              <span
                key={variant.id}
                title={variant.color ?? variant.name}
                className="h-3 w-3 rounded-full ring-1"
                style={{
                  background: variant.colorHex ?? "var(--ht-border)",
                  boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
                }}
              />
            ))}
            {options.length > 5 && (
              <span className="text-[0.65rem]" style={{ color: "var(--ht-muted)" }}>
                +{options.length - 5}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
