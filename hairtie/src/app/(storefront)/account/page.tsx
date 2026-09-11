import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatPaise } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE } from "@/lib/orders";
import { ProfileForm, PasswordForm } from "@/components/storefront/AccountForms";

export const metadata: Metadata = {
  title: "My account | Hairtie",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const user = await requireUser();

  const [orders, stats, wishlistCount] = await Promise.all([
    prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { placedAt: "desc" },
      take: 3,
      include: { items: { take: 3 } },
    }),
    prisma.order.aggregate({
      where: { userId: user.id, status: { notIn: ["CANCELLED"] } },
      _count: true,
      _sum: { total: true },
    }),
    prisma.wishlistItem.count({ where: { userId: user.id } }),
  ]);

  return (
    <div className="space-y-12">
      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Orders" value={String(stats._count)} />
        <Stat label="Total spent" value={formatPaise(stats._sum.total ?? 0)} />
        <Stat label="Wishlist" value={String(wishlistCount)} />
      </section>

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-xl">Recent orders</h2>
          <Link href="/account/orders" className="ht-underline text-sm">View all</Link>
        </div>
        {orders.length === 0 ? (
          <div className="ht-card p-8 text-center">
            <p className="text-sm" style={{ color: "var(--ht-muted)" }}>You haven&apos;t placed an order yet.</p>
            <Link href="/shop" className="ht-btn ht-btn-primary mt-4">Start shopping</Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {orders.map((order) => (
              <li key={order.id}>
                <Link href={`/order/${order.orderNumber}`} className="ht-card flex flex-wrap items-center justify-between gap-3 p-5 transition hover:opacity-80">
                  <div>
                    <p className="text-sm font-medium">{order.orderNumber}</p>
                    <p className="text-sm" style={{ color: "var(--ht-muted)" }}>
                      {formatDate(order.placedAt)} · {order.items.length} {order.items.length === 1 ? "item" : "items"} · {formatPaise(order.total)}
                    </p>
                  </div>
                  <span
                    className="ht-badge"
                    style={{ background: ORDER_STATUS_TONE[order.status].bg, color: ORDER_STATUS_TONE[order.status].color }}
                  >
                    {ORDER_STATUS_LABELS[order.status]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-xl">Your details</h2>
        <div className="ht-card p-6">
          <ProfileForm name={user.name} phone={user.phone ?? ""} email={user.email} />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl">Password</h2>
        <div className="ht-card p-6">
          <PasswordForm />
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="ht-card p-5">
      <p className="ht-eyebrow">{label}</p>
      <p className="mt-1 font-serif text-2xl">{value}</p>
    </div>
  );
}
