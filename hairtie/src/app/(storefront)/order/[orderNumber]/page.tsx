import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Package } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getSiteSettings } from "@/lib/settings";
import { formatPaise } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS, ORDER_STATUS_TONE } from "@/lib/orders";
import { whatsappLink } from "@/lib/whatsapp";
import { WhatsappIcon } from "@/components/ui/BrandIcons";

export const metadata: Metadata = {
  title: "Your order | Hairtie",
  robots: { index: false, follow: false },
};

export default async function OrderPage(props: PageProps<"/order/[orderNumber]">) {
  const { orderNumber } = await props.params;
  const search = await props.searchParams;
  const justPlaced = search.placed === "1";

  const [order, user, settings] = await Promise.all([
    prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: true,
        events: { orderBy: { createdAt: "asc" } },
      },
    }),
    getCurrentUser(),
    getSiteSettings(),
  ]);

  if (!order) notFound();

  // The order number doubles as the access token for guest checkout, so this
  // page is reachable with the link we email. That only holds because order
  // numbers carry six random characters (see generateOrderNumber) rather than
  // running in sequence. Signed-in customers and staff reach it either way.
  void user;

  const tone = ORDER_STATUS_TONE[order.status];
  const currentStep = ORDER_STATUS_FLOW.indexOf(order.status);
  const cancelled = ["CANCELLED", "RETURNED", "REFUNDED"].includes(order.status);

  return (
    <div className="ht-container max-w-4xl py-10 md:py-14">
      {justPlaced && (
        <div
          className="mb-8 flex items-start gap-4 p-6"
          style={{ borderRadius: "var(--ht-radius)", background: "var(--ht-secondary)" }}
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full" style={{ background: "var(--ht-text)", color: "var(--ht-bg)" }}>
            <Check size={18} strokeWidth={2.2} />
          </span>
          <div>
            <h1 className="text-[1.6rem]">Thank you, {order.customerName.split(" ")[0]}</h1>
            <p className="mt-1 text-sm">
              Your order is placed. We&apos;ve sent the details to {order.customerEmail}.{" "}
              {settings.shipping.dispatchNote}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {!justPlaced && <h1 className="text-[2rem]">Order {order.orderNumber}</h1>}
          {justPlaced && <p className="text-lg">Order {order.orderNumber}</p>}
          <p className="mt-1 text-sm" style={{ color: "var(--ht-muted)" }}>
            Placed on {formatDate(order.placedAt, true)}
          </p>
        </div>
        <span className="ht-badge" style={{ background: tone.bg, color: tone.color }}>
          {ORDER_STATUS_LABELS[order.status]}
        </span>
      </div>

      {!cancelled && (
        <ol className="mt-8 flex items-center gap-2" aria-label="Order progress">
          {ORDER_STATUS_FLOW.map((status, index) => {
            const done = index <= currentStep;
            return (
              <li key={status} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex w-full items-center">
                  {index > 0 && (
                    <span
                      className="h-px flex-1"
                      style={{ background: index <= currentStep ? "var(--ht-primary)" : "var(--ht-border)" }}
                    />
                  )}
                  <span
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[0.65rem]"
                    style={{
                      background: done ? "var(--ht-primary)" : "var(--ht-surface)",
                      border: `1px solid ${done ? "var(--ht-primary)" : "var(--ht-border)"}`,
                      color: done ? "#fff" : "var(--ht-muted)",
                    }}
                  >
                    {done ? <Check size={13} strokeWidth={2.4} /> : index + 1}
                  </span>
                  {index < ORDER_STATUS_FLOW.length - 1 && (
                    <span
                      className="h-px flex-1"
                      style={{ background: index < currentStep ? "var(--ht-primary)" : "var(--ht-border)" }}
                    />
                  )}
                </div>
                <span className="text-center text-[0.65rem] uppercase tracking-wider" style={{ color: done ? "var(--ht-text)" : "var(--ht-muted)" }}>
                  {ORDER_STATUS_LABELS[status]}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {order.trackingNumber && (
        <div className="ht-card mt-8 flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-3">
            <Package size={20} strokeWidth={1.5} style={{ color: "var(--ht-primary)" }} />
            <div>
              <p className="text-sm font-medium">{order.courierName ?? "Courier"}</p>
              <p className="text-sm" style={{ color: "var(--ht-muted)" }}>
                Tracking number: {order.trackingNumber}
              </p>
            </div>
          </div>
          {order.trackingUrl && (
            <a href={order.trackingUrl} target="_blank" rel="noreferrer noopener" className="ht-btn ht-btn-outline ht-btn-sm">
              Track parcel
            </a>
          )}
        </div>
      )}

      <div className="mt-10 grid gap-8 md:grid-cols-[1fr_18rem]">
        <div>
          <h2 className="text-xl">Items</h2>
          <ul className="mt-4 divide-y" style={{ borderColor: "var(--ht-border)" }}>
            {order.items.map((item) => (
              <li key={item.id} className="flex gap-4 py-4">
                <div
                  className="relative h-20 w-16 shrink-0 overflow-hidden"
                  style={{ borderRadius: "calc(var(--ht-radius) * 0.5)", background: "var(--ht-surface)" }}
                >
                  {item.imageUrl && <Image src={item.imageUrl} alt="" fill sizes="70px" className="object-cover" />}
                </div>
                <div className="flex-1">
                  <p className="text-[0.95rem]">{item.name}</p>
                  {item.variantName && (
                    <p className="text-sm" style={{ color: "var(--ht-muted)" }}>{item.variantName}</p>
                  )}
                  <p className="mt-1 text-sm" style={{ color: "var(--ht-muted)" }}>
                    Qty {item.quantity} · {formatPaise(item.price)} each
                  </p>
                </div>
                <p className="text-sm">{formatPaise(item.lineTotal)}</p>
              </li>
            ))}
          </ul>

          <dl className="mt-6 space-y-2 text-sm">
            <Row label="Subtotal" value={formatPaise(order.subtotal)} />
            {order.discountAmount > 0 && (
              <Row label={`Discount${order.couponCode ? ` (${order.couponCode})` : ""}`} value={`− ${formatPaise(order.discountAmount)}`} />
            )}
            <Row label="Shipping" value={order.shippingFee === 0 ? "Free" : formatPaise(order.shippingFee)} />
            <div className="flex justify-between border-t pt-3 text-base" style={{ borderColor: "var(--ht-border)" }}>
              <dt>Total</dt>
              <dd className="font-serif text-xl">{formatPaise(order.total)}</dd>
            </div>
          </dl>

          <div className="mt-8 flex flex-wrap gap-3">
            <a href={`/api/orders/${order.orderNumber}/invoice`} className="ht-btn ht-btn-outline ht-btn-sm">
              Download invoice
            </a>
            {settings.contact.whatsapp && (
              <a
                href={whatsappLink(
                  settings.contact.whatsapp,
                  `Hi ${settings.storeName}, I have a question about order ${order.orderNumber}.`,
                )}
                target="_blank"
                rel="noreferrer noopener"
                className="ht-btn ht-btn-sm"
                style={{ background: "#25D366", color: "#fff" }}
              >
                <WhatsappIcon size={15} /> Ask about this order
              </a>
            )}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="ht-card p-5">
            <p className="ht-eyebrow mb-2">Delivering to</p>
            <address className="text-sm not-italic leading-relaxed" style={{ color: "var(--ht-muted)" }}>
              {order.customerName}<br />
              {order.shippingLine1}<br />
              {order.shippingLine2 && <>{order.shippingLine2}<br /></>}
              {order.shippingCity}, {order.shippingState} {order.shippingPincode}<br />
              {order.customerPhone}
            </address>
          </div>

          <div className="ht-card p-5">
            <p className="ht-eyebrow mb-2">Payment</p>
            <p className="text-sm">
              {order.paymentMethod === "COD" ? "Cash on Delivery" : "Paid online"}
            </p>
            <p className="text-sm" style={{ color: "var(--ht-muted)" }}>
              {order.paymentStatus === "PAID"
                ? "Payment received"
                : order.paymentStatus === "UNPAID"
                  ? "Due at delivery"
                  : order.paymentStatus.toLowerCase()}
            </p>
          </div>

          {order.events.length > 0 && (
            <div className="ht-card p-5">
              <p className="ht-eyebrow mb-3">History</p>
              <ol className="space-y-3 text-sm">
                {order.events.map((event) => (
                  <li key={event.id}>
                    <p>{event.message}</p>
                    <p className="text-xs" style={{ color: "var(--ht-muted)" }}>
                      {formatDate(event.createdAt, true)}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </aside>
      </div>

      <div className="mt-12 text-center">
        <Link href="/shop" className="ht-btn ht-btn-primary">Continue shopping</Link>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt style={{ color: "var(--ht-muted)" }}>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
