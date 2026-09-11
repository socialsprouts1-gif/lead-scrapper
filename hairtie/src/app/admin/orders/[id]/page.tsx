import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { formatPaise } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE } from "@/lib/orders";
import { getSiteSettings } from "@/lib/settings";
import { whatsappLink } from "@/lib/whatsapp";
import { AdminPage, PageHeader, Pill } from "@/components/admin/ui";
import { OrderActions } from "@/components/admin/OrderActions";

export default async function AdminOrderPage(props: PageProps<"/admin/orders/[id]">) {
  await requireAdmin();
  const { id } = await props.params;

  const [order, settings] = await Promise.all([
    prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        events: { orderBy: { createdAt: "desc" } },
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    getSiteSettings(),
  ]);

  if (!order) notFound();

  const previousOrders = await prisma.order.count({
    where: {
      id: { not: order.id },
      OR: [{ customerEmail: order.customerEmail }, { customerPhone: order.customerPhone }],
    },
  });

  const tone = ORDER_STATUS_TONE[order.status];

  return (
    <AdminPage>
      <PageHeader
        title={`Order ${order.orderNumber}`}
        description={`Placed ${formatDate(order.placedAt, true)} · ${order.items.length} ${order.items.length === 1 ? "item" : "items"}`}
        back={{ href: "/admin/orders", label: "Orders" }}
      >
        <Pill label={ORDER_STATUS_LABELS[order.status]} bg={tone.bg} color={tone.color} />
        <a href={`/api/orders/${order.orderNumber}/invoice`} target="_blank" rel="noreferrer" className="adm-btn adm-btn-ghost">
          Invoice
        </a>
        {settings.contact.whatsapp && (
          <a
            href={whatsappLink(
              settings.contact.whatsapp,
              `Hi ${order.customerName.split(" ")[0]}, this is ${settings.storeName} about your order ${order.orderNumber}.`,
            )}
            target="_blank"
            rel="noreferrer noopener"
            className="adm-btn adm-btn-ghost"
          >
            Message customer
          </a>
        )}
      </PageHeader>

      <div className="grid gap-5 lg:grid-cols-[1fr_21rem] lg:items-start">
        <div className="space-y-5">
          <div className="adm-card p-5">
            <h2 className="mb-4 text-base">Items</h2>
            <ul className="space-y-4">
              {order.items.map((item) => (
                <li key={item.id} className="flex gap-3">
                  <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-md" style={{ background: "var(--adm-bg)" }}>
                    {item.imageUrl && <Image src={item.imageUrl} alt="" fill sizes="60px" className="object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      {item.productId ? (
                        <Link href={`/admin/products/${item.productId}`} className="underline underline-offset-2">
                          {item.name}
                        </Link>
                      ) : (
                        item.name
                      )}
                    </p>
                    <p className="text-xs" style={{ color: "var(--adm-muted)" }}>
                      {item.sku}
                      {item.variantName ? ` · ${item.variantName}` : ""} · Qty {item.quantity} · {formatPaise(item.price)} each
                    </p>
                  </div>
                  <p className="text-sm">{formatPaise(item.lineTotal)}</p>
                </li>
              ))}
            </ul>

            <dl className="mt-5 space-y-2 border-t pt-4 text-sm" style={{ borderColor: "var(--adm-line)" }}>
              <Row label="Subtotal" value={formatPaise(order.subtotal)} />
              {order.discountAmount > 0 && (
                <Row label={`Discount${order.couponCode ? ` (${order.couponCode})` : ""}`} value={`− ${formatPaise(order.discountAmount)}`} />
              )}
              <Row label="Shipping" value={order.shippingFee === 0 ? "Free" : formatPaise(order.shippingFee)} />
              <Row label="GST included" value={formatPaise(order.taxAmount)} muted />
              <div className="flex justify-between border-t pt-3 text-base" style={{ borderColor: "var(--adm-line)" }}>
                <dt>Total</dt>
                <dd className="font-medium">{formatPaise(order.total)}</dd>
              </div>
            </dl>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="adm-card p-5">
              <h2 className="mb-3 text-base">Customer</h2>
              <p className="text-sm font-medium">{order.customerName}</p>
              <p className="mt-1 text-sm" style={{ color: "var(--adm-muted)" }}>
                <a href={`tel:${order.customerPhone}`} className="underline underline-offset-2">{order.customerPhone}</a>
                <br />
                <a href={`mailto:${order.customerEmail}`} className="underline underline-offset-2">{order.customerEmail}</a>
              </p>
              <p className="mt-3 text-xs" style={{ color: "var(--adm-muted)" }}>
                {order.user ? (
                  <>
                    Has an account ·{" "}
                    <Link href={`/admin/customers/${order.user.id}`} className="underline underline-offset-2">
                      See customer
                    </Link>
                  </>
                ) : (
                  "Checked out as a guest"
                )}
                {previousOrders > 0 && ` · ${previousOrders} previous ${previousOrders === 1 ? "order" : "orders"}`}
              </p>
            </div>

            <div className="adm-card p-5">
              <h2 className="mb-3 text-base">Delivery address</h2>
              <address className="text-sm not-italic leading-relaxed" style={{ color: "var(--adm-muted)" }}>
                {order.customerName}<br />
                {order.shippingLine1}<br />
                {order.shippingLine2 && <>{order.shippingLine2}<br /></>}
                {order.shippingCity}, {order.shippingState} {order.shippingPincode}<br />
                {order.shippingCountry}
              </address>
            </div>
          </div>

          {order.customerNote && (
            <div className="adm-card p-5">
              <h2 className="mb-2 text-base">Note from the customer</h2>
              <p className="text-sm" style={{ color: "var(--adm-muted)" }}>{order.customerNote}</p>
            </div>
          )}

          <div className="adm-card p-5">
            <h2 className="mb-3 text-base">History</h2>
            <ol className="space-y-3 text-sm">
              {order.events.map((event) => (
                <li key={event.id} className="flex gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--adm-accent)" }} />
                  <div>
                    <p>{event.message}</p>
                    <p className="text-xs" style={{ color: "var(--adm-muted)" }}>
                      {formatDate(event.createdAt, true)}
                      {event.createdBy ? ` · ${event.createdBy}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <OrderActions
          orderId={order.id}
          status={order.status}
          paymentStatus={order.paymentStatus}
          courierName={order.courierName ?? ""}
          trackingNumber={order.trackingNumber ?? ""}
          trackingUrl={order.trackingUrl ?? ""}
          adminNote={order.adminNote ?? ""}
          total={order.total}
          refundAmount={order.refundAmount}
        />
      </div>
    </AdminPage>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt style={{ color: "var(--adm-muted)" }}>{label}</dt>
      <dd style={{ color: muted ? "var(--adm-muted)" : undefined }}>{value}</dd>
    </div>
  );
}
