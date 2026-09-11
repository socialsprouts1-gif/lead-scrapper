import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { computeTotals, getCart, lineMrp, linePrice, lineStock } from "@/lib/cart";
import { getSiteSettings } from "@/lib/settings";
import { CartLines, type CartLineView } from "@/components/storefront/CartLines";
import { CouponBox } from "@/components/storefront/CouponBox";
import { OrderSummary } from "@/components/storefront/OrderSummary";

export const metadata: Metadata = {
  title: "Your Bag | Hairtie",
  robots: { index: false, follow: true },
};

export default async function CartPage() {
  const [cart, settings] = await Promise.all([getCart(), getSiteSettings()]);
  const totals = await computeTotals(cart, settings);

  const toView = (line: NonNullable<typeof cart>["items"][number]): CartLineView => ({
    id: line.id,
    productSlug: line.product.slug,
    name: line.product.name,
    variantName: line.variant?.name ?? null,
    image: line.variant?.imageUrl ?? line.product.images[0]?.url ?? null,
    price: linePrice(line),
    mrp: lineMrp(line),
    quantity: line.quantity,
    maxQuantity: Math.min(lineStock(line), 10),
    savedForLater: line.savedForLater,
  });

  const active = (cart?.items ?? []).filter((line) => !line.savedForLater).map(toView);
  const saved = (cart?.items ?? []).filter((line) => line.savedForLater).map(toView);

  if (active.length === 0 && saved.length === 0) {
    return (
      <div className="ht-container py-24 text-center">
        <ShoppingBag size={38} strokeWidth={1} className="mx-auto" style={{ color: "var(--ht-muted)" }} />
        <h1 className="mt-5 text-[2rem]">Your bag is empty</h1>
        <p className="mx-auto mt-2 max-w-sm text-[0.98rem]" style={{ color: "var(--ht-muted)" }}>
          Have a look at what&apos;s new — there&apos;s usually something worth adding.
        </p>
        <Link href="/shop" className="ht-btn ht-btn-primary mt-7">Start shopping</Link>
      </div>
    );
  }

  return (
    <div className="ht-container py-10 md:py-14">
      <h1 className="text-[2.1rem] md:text-[2.6rem]">Your bag</h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_22rem] lg:gap-14">
        <div>
          {active.length > 0 ? (
            <CartLines lines={active} />
          ) : (
            <div className="ht-card p-8 text-center">
              <p className="text-sm" style={{ color: "var(--ht-muted)" }}>
                Nothing in your bag right now — your saved items are below.
              </p>
            </div>
          )}

          {saved.length > 0 && (
            <section className="mt-12">
              <h2 className="text-xl">Saved for later ({saved.length})</h2>
              <div className="mt-2">
                <CartLines lines={saved} />
              </div>
            </section>
          )}

          <Link href="/shop" className="ht-underline mt-8 inline-block text-sm">
            ← Continue shopping
          </Link>
        </div>

        <div className="space-y-5 lg:sticky lg:top-28 lg:self-start">
          <CouponBox
            appliedCode={totals.couponCode}
            appliedLabel={totals.couponLabel}
            error={totals.couponError}
          />
          <OrderSummary totals={totals}>
            {active.length > 0 ? (
              <Link href="/checkout" className="ht-btn ht-btn-primary w-full">
                Proceed to Checkout
              </Link>
            ) : (
              <button type="button" disabled className="ht-btn ht-btn-primary w-full">
                Proceed to Checkout
              </button>
            )}
          </OrderSummary>
          <p className="text-center text-xs" style={{ color: "var(--ht-muted)" }}>
            {settings.shipping.dispatchNote}
          </p>
        </div>
      </div>
    </div>
  );
}
