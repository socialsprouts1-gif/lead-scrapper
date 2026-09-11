"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Heart, Minus, Plus, ShoppingBag } from "lucide-react";
import { addToCart } from "@/app/actions/cart";
import { toggleWishlist } from "@/app/actions/wishlist";
import { useToast } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Spinner";
import { Price } from "@/components/ui/Price";
import { WhatsappIcon } from "@/components/ui/BrandIcons";

export type PurchaseVariant = {
  id: string;
  name: string;
  color: string | null;
  colorHex: string | null;
  size: string | null;
  price: number | null;
  mrp: number | null;
  stock: number;
};

export function ProductPurchase({
  productId,
  productName,
  basePrice,
  baseMrp,
  baseStock,
  trackInventory,
  lowStockThreshold,
  variants,
  wishlisted,
  whatsappHref,
}: {
  productId: string;
  productName: string;
  basePrice: number;
  baseMrp: number;
  baseStock: number;
  trackInventory: boolean;
  lowStockThreshold: number;
  variants: PurchaseVariant[];
  wishlisted: boolean;
  whatsappHref: string;
}) {
  const router = useRouter();
  const { show } = useToast();
  const [variantId, setVariantId] = useState<string | null>(variants[0]?.id ?? null);
  const [quantity, setQuantity] = useState(1);
  const [saved, setSaved] = useState(wishlisted);
  const [adding, startAdding] = useTransition();
  const [buying, startBuying] = useTransition();
  const [savingWish, startWish] = useTransition();

  const variant = variants.find((v) => v.id === variantId) ?? null;
  const price = variant?.price ?? basePrice;
  const mrp = variant?.mrp ?? baseMrp;
  const stock = trackInventory ? (variant ? variant.stock : baseStock) : Number.MAX_SAFE_INTEGER;
  const soldOut = stock <= 0;
  const low = !soldOut && stock <= lowStockThreshold;

  function add(then?: () => void) {
    return addToCart({ productId, variantId, quantity }).then((result) => {
      show(result.message ?? (result.ok ? "Added to your bag." : "Could not add that."), result.ok ? "default" : "error");
      if (result.ok) then?.();
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <Price price={price} mrp={mrp} size="lg" />
        <p className="mt-1 text-xs" style={{ color: "var(--ht-muted)" }}>
          Inclusive of all taxes
        </p>
      </div>

      {variants.length > 0 && (
        <div>
          <div className="mb-2.5 flex items-baseline justify-between">
            <span className="ht-label mb-0">Colour</span>
            <span className="text-sm">{variant?.color ?? variant?.name}</span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {variants.map((option) => {
              const active = option.id === variantId;
              const outOfStock = trackInventory && option.stock <= 0;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setVariantId(option.id);
                    setQuantity(1);
                  }}
                  disabled={outOfStock}
                  aria-pressed={active}
                  title={`${option.color ?? option.name}${outOfStock ? " — sold out" : ""}`}
                  className="relative grid h-10 w-10 place-items-center rounded-full transition disabled:opacity-40"
                  style={{
                    outline: active ? "1.5px solid var(--ht-text)" : "1px solid var(--ht-border)",
                    outlineOffset: "2px",
                  }}
                >
                  <span
                    className="h-full w-full rounded-full"
                    style={{
                      background: option.colorHex ?? "var(--ht-secondary)",
                      boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.07)",
                    }}
                  />
                  {outOfStock && (
                    <span className="absolute inset-0 grid place-items-center text-[0.6rem]" style={{ color: "#fff" }}>
                      ✕
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        <div>
          <span className="ht-label">Quantity</span>
          <div className="flex items-center" style={{ border: "1px solid var(--ht-border)", borderRadius: "999px" }}>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              aria-label="Decrease quantity"
              className="grid h-10 w-10 place-items-center rounded-full disabled:opacity-35"
            >
              <Minus size={15} strokeWidth={1.7} />
            </button>
            <span className="w-8 text-center text-sm tabular-nums">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(q + 1, Math.min(stock, 10)))}
              disabled={quantity >= Math.min(stock, 10)}
              aria-label="Increase quantity"
              className="grid h-10 w-10 place-items-center rounded-full disabled:opacity-35"
            >
              <Plus size={15} strokeWidth={1.7} />
            </button>
          </div>
        </div>
        <div className="pt-6 text-sm">
          {soldOut ? (
            <span style={{ color: "#a33" }}>Out of stock</span>
          ) : low ? (
            <span style={{ color: "#8a5a3c" }}>Only {stock} left</span>
          ) : (
            <span style={{ color: "var(--ht-primary)" }}>In stock</span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled={soldOut || adding}
          onClick={() => startAdding(() => add())}
          className="ht-btn ht-btn-primary flex-1"
        >
          {adding ? <Spinner size={15} /> : <ShoppingBag size={16} strokeWidth={1.7} />}
          Add to Bag
        </button>
        <button
          type="button"
          disabled={soldOut || buying}
          onClick={() => startBuying(() => add(() => router.push("/checkout")))}
          className="ht-btn ht-btn-soft flex-1"
        >
          {buying ? <Spinner size={15} /> : null}
          Buy Now
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <button
          type="button"
          disabled={savingWish}
          onClick={() =>
            startWish(async () => {
              const result = await toggleWishlist(productId);
              if (result.requiresLogin) {
                show(result.message ?? "Please sign in.", "error");
                router.push("/account/login?next=" + encodeURIComponent(window.location.pathname));
                return;
              }
              if (result.ok) {
                setSaved(Boolean(result.active));
                show(result.message ?? "");
              }
            })
          }
          className="ht-underline flex items-center gap-2"
          style={{ color: saved ? "#b5555f" : "var(--ht-text)" }}
        >
          <Heart size={16} strokeWidth={1.6} className={saved ? "fill-current" : ""} />
          {saved ? "Saved to wishlist" : "Add to wishlist"}
        </button>

        {whatsappHref && (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer noopener"
            className="ht-underline flex items-center gap-2"
          >
            <WhatsappIcon size={16} />
            Ask about this product
          </a>
        )}
      </div>

      {/* Sticky mobile buy bar */}
      <div
        className="fixed inset-x-0 bottom-[3.9rem] z-30 flex items-center gap-3 px-4 py-3 md:hidden"
        style={{
          background: "color-mix(in srgb, var(--ht-bg) 95%, transparent)",
          backdropFilter: "blur(10px)",
          borderTop: "1px solid var(--ht-border)",
        }}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs" style={{ color: "var(--ht-muted)" }}>
            {productName}
          </p>
          <Price price={price} mrp={mrp} size="sm" />
        </div>
        <button
          type="button"
          disabled={soldOut || adding}
          onClick={() => startAdding(() => add())}
          className="ht-btn ht-btn-primary shrink-0"
        >
          {adding ? <Spinner size={14} /> : null}
          {soldOut ? "Sold out" : "Add to Bag"}
        </button>
      </div>
    </div>
  );
}
