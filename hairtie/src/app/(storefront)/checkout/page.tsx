import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { computeTotals, getCart, linePrice } from "@/lib/cart";
import { getSiteSettings } from "@/lib/settings";
import { razorpayConfigured } from "@/lib/razorpay";
import { formatPaise } from "@/lib/money";
import { CheckoutForm } from "@/components/storefront/CheckoutForm";
import { OrderSummary } from "@/components/storefront/OrderSummary";

export const metadata: Metadata = {
  title: "Checkout | Hairtie",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const resolved = await getCart();
  const settings = getSiteSettings();
  const lines = (resolved?.lines ?? []).filter((line) => !line.item.savedForLater);
  if (lines.length === 0) redirect("/cart");

  const totals = computeTotals(resolved, settings);

  return (
    <div className="ht-container py-10 md:py-14">
      <div className="mb-8 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-[2.1rem] md:text-[2.6rem]">Checkout</h1>
        <Link href="/cart" className="ht-underline text-sm">← Back to bag</Link>
      </div>

      <div className="grid gap-12 lg:grid-cols-[1fr_22rem] lg:gap-16">
        <CheckoutForm
          codEnabled={settings.shipping.codEnabled}
          onlineEnabled={settings.shipping.onlinePaymentEnabled}
          onlineConfigured={razorpayConfigured()}
          total={totals.total}
        />

        <div className="space-y-5 lg:sticky lg:top-28 lg:self-start">
          <div className="ht-card p-6">
            <h2 className="text-xl">Your order</h2>
            <ul className="mt-4 space-y-4">
              {lines.map((line) => (
                <li key={line.item.id} className="flex gap-3">
                  <div
                    className="relative h-16 w-14 shrink-0 overflow-hidden"
                    style={{ borderRadius: "calc(var(--ht-radius) * 0.5)", background: "var(--ht-bg)" }}
                  >
                    {line.product.images[0] && (
                      <Image src={line.product.images[0].url} alt="" fill sizes="60px" className="object-cover" />
                    )}
                    <span
                      className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full text-[0.6rem]"
                      style={{ background: "var(--ht-text)", color: "var(--ht-bg)" }}
                    >
                      {line.item.quantity}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{line.product.name}</p>
                    {line.variant && (
                      <p className="text-xs" style={{ color: "var(--ht-muted)" }}>{line.variant.name}</p>
                    )}
                  </div>
                  <p className="text-sm">{formatPaise(linePrice(line) * line.item.quantity)}</p>
                </li>
              ))}
            </ul>
          </div>

          <OrderSummary totals={totals} />
        </div>
      </div>
    </div>
  );
}
