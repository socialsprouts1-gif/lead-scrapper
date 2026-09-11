import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSiteSettings } from "@/lib/settings";
import { buildMetadata, resolveSiteUrl } from "@/lib/seo";
import { formatDate } from "@/lib/utils";
import { formatPaise } from "@/lib/money";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE } from "@/lib/orders";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const siteUrl = await resolveSiteUrl(settings);
  return buildMetadata({
    settings,
    siteUrl,
    title: "Track Your Order | Hairtie",
    description: "Enter your Hairtie order number and mobile number to see where your parcel is.",
    path: "/track-order",
  });
}

export default async function TrackOrderPage(props: PageProps<"/track-order">) {
  const params = await props.searchParams;
  const orderNumber = typeof params.orderNumber === "string" ? params.orderNumber.trim().toUpperCase() : "";
  const phone = typeof params.phone === "string" ? params.phone.replace(/\D/g, "").slice(-10) : "";

  let order = null;
  let error = "";

  if (orderNumber && phone) {
    // Both the order number and the phone must match, so a leaked order number
    // alone does not expose a customer's address here.
    const found = await prisma.order.findUnique({
      where: { orderNumber },
      include: { items: true, events: { orderBy: { createdAt: "desc" } } },
    });
    if (found && found.customerPhone.replace(/\D/g, "").endsWith(phone)) {
      order = found;
    } else {
      error = "We couldn't find an order with those details. Please check and try again.";
    }
  }

  return (
    <div className="ht-container max-w-3xl py-12 md:py-16">
      <h1 className="text-[2.1rem] md:text-[2.6rem]">Track your order</h1>
      <p className="mt-2 text-[0.98rem]" style={{ color: "var(--ht-muted)" }}>
        Enter your order number and the mobile number you ordered with.
      </p>

      <form method="get" className="mt-8 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label className="ht-label" htmlFor="orderNumber">Order number</label>
          <input id="orderNumber" name="orderNumber" defaultValue={orderNumber} required placeholder="HT250910ABCDEF" className="ht-input uppercase" />
        </div>
        <div>
          <label className="ht-label" htmlFor="phone">Mobile number</label>
          <input id="phone" name="phone" defaultValue={phone} required inputMode="numeric" placeholder="10-digit number" className="ht-input" />
        </div>
        <button type="submit" className="ht-btn ht-btn-primary">Track</button>
      </form>

      {error && (
        <p className="mt-6 rounded-xl px-4 py-3 text-sm" style={{ background: "#f6e7e7", color: "#8a3c3c" }}>
          {error}
        </p>
      )}

      {order && (
        <div className="ht-card mt-10 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-lg">{order.orderNumber}</p>
              <p className="text-sm" style={{ color: "var(--ht-muted)" }}>
                Placed {formatDate(order.placedAt)} · {order.items.length} {order.items.length === 1 ? "item" : "items"} · {formatPaise(order.total)}
              </p>
            </div>
            <span className="ht-badge" style={ORDER_STATUS_TONE[order.status] ? { background: ORDER_STATUS_TONE[order.status].bg, color: ORDER_STATUS_TONE[order.status].color } : undefined}>
              {ORDER_STATUS_LABELS[order.status]}
            </span>
          </div>

          {order.trackingNumber && (
            <p className="mt-4 text-sm">
              {order.courierName ?? "Courier"} · {order.trackingNumber}
              {order.trackingUrl && (
                <>
                  {" — "}
                  <a href={order.trackingUrl} target="_blank" rel="noreferrer noopener" className="ht-underline">
                    open tracking
                  </a>
                </>
              )}
            </p>
          )}

          <ol className="mt-6 space-y-3 text-sm">
            {order.events.map((event) => (
              <li key={event.id} className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--ht-primary)" }} />
                <div>
                  <p>{event.message}</p>
                  <p className="text-xs" style={{ color: "var(--ht-muted)" }}>{formatDate(event.createdAt, true)}</p>
                </div>
              </li>
            ))}
          </ol>

          <Link href={`/order/${order.orderNumber}`} className="ht-btn ht-btn-outline ht-btn-sm mt-6">
            See full order
          </Link>
        </div>
      )}
    </div>
  );
}
