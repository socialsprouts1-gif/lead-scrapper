import Link from "next/link";
import { notFound } from "next/navigation";
import { customerByKey } from "@/lib/orders";
import { formatPaise } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE } from "@/lib/order-status";
import { getSiteSettings } from "@/lib/settings";
import { whatsappLink } from "@/lib/whatsapp";
import { AdminPage, PageHeader, Pill, StatCard } from "@/components/admin/ui";

export default async function AdminCustomerPage(props: PageProps<"/admin/customers/[id]">) {
  const { id } = await props.params;
  const customer = customerByKey(decodeURIComponent(id));
  const settings = getSiteSettings();

  if (!customer) notFound();

  const lastOrder = customer.orders[0];

  return (
    <AdminPage>
      <PageHeader
        title={customer.name}
        description={`${customer.email} · ${customer.phone}`}
        back={{ href: "/admin/customers", label: "Customers" }}
      >
        {customer.phone && (
          <a
            href={whatsappLink(
              customer.phone,
              `Hi ${customer.name.split(" ")[0]}, this is ${settings.storeName}.`,
            )}
            target="_blank"
            rel="noreferrer noopener"
            className="adm-btn adm-btn-ghost"
          >
            Message on WhatsApp
          </a>
        )}
        <a href={`mailto:${customer.email}`} className="adm-btn adm-btn-ghost">
          Send an email
        </a>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Orders" value={String(customer.orderCount)} />
        <StatCard label="Total spent" value={formatPaise(customer.totalSpent)} />
        <StatCard
          label="Average order"
          value={
            customer.orderCount
              ? formatPaise(Math.round(customer.totalSpent / customer.orderCount))
              : "—"
          }
        />
        <StatCard
          label="First ordered"
          value={customer.firstOrderAt ? formatDate(customer.firstOrderAt) : "—"}
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div className="adm-card p-5">
          <h2 className="mb-4 text-base">Order history</h2>
          <div className="adm-scroll">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {customer.orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link href={`/admin/orders/${order.id}`} className="underline underline-offset-2">
                        {order.orderNumber}
                      </Link>
                      <div className="text-xs" style={{ color: "var(--adm-muted)" }}>
                        {formatDate(order.placedAt)}
                      </div>
                    </td>
                    <td>{order.items.length}</td>
                    <td>{formatPaise(order.total)}</td>
                    <td>
                      <Pill
                        label={ORDER_STATUS_LABELS[order.status]}
                        bg={ORDER_STATUS_TONE[order.status].bg}
                        color={ORDER_STATUS_TONE[order.status].color}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {lastOrder && (
          <div className="adm-card p-5">
            <h2 className="mb-3 text-base">Most recent address</h2>
            <address className="text-sm not-italic leading-relaxed" style={{ color: "var(--adm-muted)" }}>
              {lastOrder.customerName}<br />
              {lastOrder.shippingLine1}
              {lastOrder.shippingLine2 ? `, ${lastOrder.shippingLine2}` : ""}<br />
              {lastOrder.shippingCity}, {lastOrder.shippingState} {lastOrder.shippingPincode}<br />
              {lastOrder.customerPhone}
            </address>
          </div>
        )}
      </div>
    </AdminPage>
  );
}
