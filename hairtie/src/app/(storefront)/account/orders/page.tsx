import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatPaise } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE } from "@/lib/orders";

export const metadata: Metadata = {
  title: "My orders | Hairtie",
  robots: { index: false, follow: false },
};

export default async function AccountOrdersPage() {
  const user = await requireUser();
  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { placedAt: "desc" },
    include: { items: true },
  });

  if (orders.length === 0) {
    return (
      <div className="ht-card p-10 text-center">
        <h2 className="font-serif text-2xl">No orders yet</h2>
        <p className="mt-2 text-sm" style={{ color: "var(--ht-muted)" }}>
          When you place an order it will show up here.
        </p>
        <Link href="/shop" className="ht-btn ht-btn-primary mt-6">Start shopping</Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {orders.map((order) => (
        <article key={order.id} className="ht-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Link href={`/order/${order.orderNumber}`} className="ht-underline text-[0.98rem]">
                {order.orderNumber}
              </Link>
              <p className="mt-0.5 text-sm" style={{ color: "var(--ht-muted)" }}>
                {formatDate(order.placedAt)} · {formatPaise(order.total)}
              </p>
            </div>
            <span
              className="ht-badge"
              style={{ background: ORDER_STATUS_TONE[order.status].bg, color: ORDER_STATUS_TONE[order.status].color }}
            >
              {ORDER_STATUS_LABELS[order.status]}
            </span>
          </div>

          <div className="ht-scroll-x mt-4">
            {order.items.map((item) => (
              <div key={item.id} className="flex w-56 gap-3">
                <div
                  className="relative h-16 w-14 shrink-0 overflow-hidden"
                  style={{ borderRadius: "calc(var(--ht-radius) * 0.5)", background: "var(--ht-bg)" }}
                >
                  {item.imageUrl && <Image src={item.imageUrl} alt="" fill sizes="60px" className="object-cover" />}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm">{item.name}</p>
                  <p className="text-xs" style={{ color: "var(--ht-muted)" }}>Qty {item.quantity}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link href={`/order/${order.orderNumber}`} className="ht-btn ht-btn-outline ht-btn-sm">
              View details
            </Link>
            <a href={`/api/orders/${order.orderNumber}/invoice`} className="ht-btn ht-btn-outline ht-btn-sm">
              Invoice
            </a>
          </div>
        </article>
      ))}
    </div>
  );
}
