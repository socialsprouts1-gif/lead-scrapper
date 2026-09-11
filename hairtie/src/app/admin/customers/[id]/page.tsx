import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { formatPaise } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE } from "@/lib/orders";
import { getSiteSettings } from "@/lib/settings";
import { whatsappLink } from "@/lib/whatsapp";
import { AdminPage, PageHeader, Pill, StatCard } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/Controls";
import { setCustomerStatus } from "@/app/actions/admin/misc";
import { CustomerNote } from "@/components/admin/CustomerNote";

export default async function AdminCustomerPage(props: PageProps<"/admin/customers/[id]">) {
  await requireAdmin();
  const { id } = await props.params;

  const [customer, settings] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      include: {
        orders: { orderBy: { placedAt: "desc" }, include: { items: { select: { id: true } } } },
        addresses: { orderBy: [{ isDefault: "desc" }] },
        reviews: { select: { id: true } },
      },
    }),
    getSiteSettings(),
  ]);

  if (!customer) notFound();

  const paid = customer.orders.filter((order) => !["CANCELLED"].includes(order.status));
  const spent = paid.reduce((sum, order) => sum + order.total, 0);

  return (
    <AdminPage>
      <PageHeader
        title={customer.name}
        description={`${customer.email}${customer.phone ? ` · ${customer.phone}` : ""} · Joined ${formatDate(customer.createdAt)}`}
        back={{ href: "/admin/customers", label: "Customers" }}
      >
        {customer.phone && settings.contact.whatsapp && (
          <a
            href={whatsappLink(customer.phone, `Hi ${customer.name.split(" ")[0]}, this is ${settings.storeName}.`)}
            target="_blank"
            rel="noreferrer noopener"
            className="adm-btn adm-btn-ghost"
          >
            Message on WhatsApp
          </a>
        )}
        {customer.role === "CUSTOMER" && (
          customer.status === "BLOCKED" ? (
            <ActionButton
              action={() => setCustomerStatus(customer.id, "ACTIVE")}
              className="adm-btn adm-btn-ghost"
            >
              Unblock
            </ActionButton>
          ) : (
            <ActionButton
              action={() => setCustomerStatus(customer.id, "BLOCKED")}
              className="adm-btn adm-btn-danger"
              confirm="Block this customer? They will not be able to sign in."
            >
              Block
            </ActionButton>
          )
        )}
      </PageHeader>

      {customer.status === "BLOCKED" && (
        <div className="mb-5">
          <Pill label="This account is blocked" bg="#f6e7e7" color="#8a3c3c" />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Orders" value={String(paid.length)} />
        <StatCard label="Total spent" value={formatPaise(spent)} />
        <StatCard
          label="Average order"
          value={paid.length ? formatPaise(Math.round(spent / paid.length)) : "—"}
        />
        <StatCard label="Reviews written" value={String(customer.reviews.length)} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div className="adm-card p-5">
          <h2 className="mb-4 text-base">Order history</h2>
          {customer.orders.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--adm-muted)" }}>
              This person has an account but hasn&apos;t ordered yet.
            </p>
          ) : (
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
          )}
        </div>

        <div className="space-y-5">
          <div className="adm-card p-5">
            <h2 className="mb-3 text-base">Addresses</h2>
            {customer.addresses.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--adm-muted)" }}>No saved addresses.</p>
            ) : (
              <ul className="space-y-4">
                {customer.addresses.map((address) => (
                  <li key={address.id} className="text-sm">
                    <p className="font-medium">
                      {address.label}
                      {address.isDefault && <span className="adm-pill ml-2" style={{ background: "var(--adm-accent-soft)", color: "var(--adm-accent)" }}>Default</span>}
                    </p>
                    <address className="mt-1 not-italic leading-relaxed" style={{ color: "var(--adm-muted)" }}>
                      {address.fullName}<br />
                      {address.line1}{address.line2 ? `, ${address.line2}` : ""}<br />
                      {address.city}, {address.state} {address.pincode}<br />
                      {address.phone}
                    </address>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <CustomerNote userId={customer.id} note={customer.notes ?? ""} />
        </div>
      </div>
    </AdminPage>
  );
}
