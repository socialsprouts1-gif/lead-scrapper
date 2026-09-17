import { formatPaise } from "@/lib/money";
import type { CartTotals } from "@/lib/cart";

export function OrderSummary({ totals, children }: { totals: CartTotals; children?: React.ReactNode }) {
  return (
    <div className="ht-card p-6">
      <h2 className="text-xl">Order summary</h2>

      <dl className="mt-5 space-y-3 text-sm">
        <Row label={`Subtotal (${totals.itemCount} ${totals.itemCount === 1 ? "item" : "items"})`} value={formatPaise(totals.subtotal)} />
        {totals.mrpTotal > totals.subtotal && (
          <Row
            label="You save"
            value={`− ${formatPaise(totals.mrpTotal - totals.subtotal)}`}
            tone="var(--ht-primary)"
          />
        )}
        {totals.discount > 0 && (
          <Row
            label={`Coupon${totals.couponCode ? ` (${totals.couponCode})` : ""}`}
            value={`− ${formatPaise(totals.discount)}`}
            tone="var(--ht-primary)"
          />
        )}
        <Row
          label="Shipping"
          value={totals.shippingFee === 0 ? "Free" : formatPaise(totals.shippingFee)}
        />
      </dl>

      {totals.amountToFreeShipping > 0 && (
        <p className="mt-4 rounded-lg px-3 py-2 text-xs" style={{ background: "var(--ht-secondary)" }}>
          Add {formatPaise(totals.amountToFreeShipping)} more for free shipping.
        </p>
      )}

      <div
        className="mt-5 flex items-baseline justify-between border-t pt-5"
        style={{ borderColor: "var(--ht-border)" }}
      >
        <span className="text-base">Total</span>
        <span className="font-serif text-2xl">{formatPaise(totals.total)}</span>
      </div>
      <p className="mt-1 text-xs" style={{ color: "var(--ht-muted)" }}>
        Includes {formatPaise(totals.taxIncluded)} GST
      </p>

      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt style={{ color: "var(--ht-muted)" }}>{label}</dt>
      <dd style={{ color: tone }}>{value}</dd>
    </div>
  );
}
