"use client";

import Image from "next/image";
import Link from "next/link";
import { useTransition } from "react";
import { Minus, Plus, Trash2, Bookmark, RotateCcw } from "lucide-react";
import { removeCartItem, setSavedForLater, updateCartItem } from "@/app/actions/cart";
import { useToast } from "@/components/ui/Toast";
import { Price } from "@/components/ui/Price";
import { formatPaise } from "@/lib/money";

export type CartLineView = {
  id: string;
  productSlug: string;
  name: string;
  variantName: string | null;
  image: string | null;
  price: number;
  mrp: number;
  quantity: number;
  maxQuantity: number;
  savedForLater: boolean;
};

export function CartLines({ lines }: { lines: CartLineView[] }) {
  return (
    <ul className="divide-y" style={{ borderColor: "var(--ht-border)" }}>
      {lines.map((line) => (
        <CartLine key={line.id} line={line} />
      ))}
    </ul>
  );
}

function CartLine({ line }: { line: CartLineView }) {
  const { show } = useToast();
  const [pending, start] = useTransition();

  function run(action: () => Promise<{ ok: boolean; message?: string }>) {
    start(async () => {
      const result = await action();
      if (result.message) show(result.message, result.ok ? "default" : "error");
    });
  }

  return (
    <li className="flex gap-4 py-5" style={{ opacity: pending ? 0.55 : 1 }}>
      <Link
        href={`/products/${line.productSlug}`}
        className="relative h-28 w-22 shrink-0 overflow-hidden md:h-32 md:w-26"
        style={{ width: "5.5rem", borderRadius: "calc(var(--ht-radius) * 0.6)", background: "var(--ht-surface)" }}
      >
        {line.image && <Image src={line.image} alt={line.name} fill sizes="110px" className="object-cover" />}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/products/${line.productSlug}`} className="ht-underline text-[0.98rem]">
              {line.name}
            </Link>
            {line.variantName && (
              <p className="mt-0.5 text-sm" style={{ color: "var(--ht-muted)" }}>
                {line.variantName}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => run(() => removeCartItem(line.id))}
            disabled={pending}
            aria-label={`Remove ${line.name}`}
            className="shrink-0 p-1 transition hover:opacity-60"
            style={{ color: "var(--ht-muted)" }}
          >
            <Trash2 size={16} strokeWidth={1.5} />
          </button>
        </div>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-3">
          {line.savedForLater ? (
            <button
              type="button"
              onClick={() => run(() => setSavedForLater(line.id, false))}
              disabled={pending}
              className="ht-btn ht-btn-outline ht-btn-sm"
            >
              <RotateCcw size={13} strokeWidth={1.6} /> Move to bag
            </button>
          ) : (
            <div className="flex items-center gap-4">
              <div className="flex items-center" style={{ border: "1px solid var(--ht-border)", borderRadius: "999px" }}>
                <button
                  type="button"
                  onClick={() => run(() => updateCartItem(line.id, line.quantity - 1))}
                  disabled={pending}
                  aria-label="Decrease quantity"
                  className="grid h-8 w-8 place-items-center rounded-full"
                >
                  <Minus size={13} strokeWidth={1.8} />
                </button>
                <span className="w-7 text-center text-sm tabular-nums">{line.quantity}</span>
                <button
                  type="button"
                  onClick={() => run(() => updateCartItem(line.id, line.quantity + 1))}
                  disabled={pending || line.quantity >= line.maxQuantity}
                  aria-label="Increase quantity"
                  className="grid h-8 w-8 place-items-center rounded-full disabled:opacity-35"
                >
                  <Plus size={13} strokeWidth={1.8} />
                </button>
              </div>
              <button
                type="button"
                onClick={() => run(() => setSavedForLater(line.id, true))}
                disabled={pending}
                className="ht-underline flex items-center gap-1.5 text-xs"
                style={{ color: "var(--ht-muted)" }}
              >
                <Bookmark size={13} strokeWidth={1.6} /> Save for later
              </button>
            </div>
          )}

          <div className="text-right">
            <Price price={line.price * line.quantity} mrp={line.mrp * line.quantity} size="sm" />
            {line.quantity > 1 && (
              <p className="text-xs" style={{ color: "var(--ht-muted)" }}>
                {formatPaise(line.price)} each
              </p>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
