import Link from "next/link";
import Image from "next/image";
import { AlertTriangle, ArrowRight, Package, Sparkles } from "lucide-react";
import { allProducts, liveProducts, stockOf } from "@/lib/catalog";
import { allOrders, customerSummaries } from "@/lib/orders";
import { pendingReviewCount } from "@/lib/reviews";
import { formatPaise } from "@/lib/money";
import { daysAgo } from "@/lib/dates";
import { formatDate } from "@/lib/utils";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE } from "@/lib/order-status";
import { AdminPage, EmptyState, PageHeader, Pill, StatCard } from "@/components/admin/ui";

export default function AdminDashboard() {
  const orders = allOrders();
  const counted = orders.filter(
    (order) => !["CANCELLED", "RETURNED", "REFUNDED"].includes(order.status),
  );

  const since = daysAgo(30);
  const recent = counted.filter((order) => new Date(order.placedAt) >= since);

  const salesAllTime = counted.reduce((sum, order) => sum + order.total, 0);
  const sales30 = recent.reduce((sum, order) => sum + order.total, 0);
  const pendingCount = orders.filter((order) => ["PENDING", "CONFIRMED"].includes(order.status)).length;

  const products = allProducts();
  const productCount = liveProducts().length;
  const draftCount = products.filter((product) => product.status === "DRAFT").length;
  const customerCount = customerSummaries().length;
  const pendingReviews = pendingReviewCount();

  const lowStock = products
    .filter((product) => product.status === "ACTIVE" && product.trackInventory)
    .map((product) => ({ ...product, available: stockOf(product) }))
    .filter((product) => product.available <= product.lowStockThreshold)
    .sort((a, b) => a.available - b.available)
    .slice(0, 8);

  const recentOrders = orders.slice(0, 6);
  const bestSellers = products
    .filter((product) => product.status === "ACTIVE" && product.salesCount > 0)
    .sort((a, b) => b.salesCount - a.salesCount)
    .slice(0, 5);

  return (
    <AdminPage>
      <PageHeader
        title="Your shop today"
        description="Here's how the shop is doing. Everything on this page links to where you can act on it."
      >
        <Link href="/admin/products/new" className="adm-btn adm-btn-primary">
          <Sparkles size={15} strokeWidth={1.7} /> Add a product
        </Link>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Sales (30 days)"
          value={formatPaise(sales30)}
          hint={`${recent.length} ${recent.length === 1 ? "order" : "orders"}`}
          href="/admin/analytics"
        />
        <StatCard
          label="Total sales"
          value={formatPaise(salesAllTime)}
          hint={`${orders.length} orders all time`}
          href="/admin/orders"
        />
        <StatCard
          label="Orders to handle"
          value={String(pendingCount)}
          hint="New and confirmed"
          href="/admin/orders?status=PENDING"
        />
        <StatCard
          label="Customers"
          value={String(customerCount)}
          hint={`${productCount} live products`}
          href="/admin/customers"
        />
      </div>

      {(lowStock.length > 0 || pendingReviews > 0 || draftCount > 0) && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {lowStock.length > 0 && (
            <div className="adm-card p-5">
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle size={16} strokeWidth={1.7} style={{ color: "#b4762f" }} />
                <h2 className="text-base">Running low on stock</h2>
              </div>
              <ul className="space-y-2 text-sm">
                {lowStock.map((product) => (
                  <li key={product.id} className="flex items-center justify-between gap-3">
                    <Link href={`/admin/products/${product.id}`} className="truncate underline underline-offset-2">
                      {product.name}
                    </Link>
                    <span style={{ color: product.available === 0 ? "#9c3a3a" : "#b4762f" }}>
                      {product.available === 0 ? "Sold out" : `${product.available} left`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-4">
            {pendingReviews > 0 && (
              <Link href="/admin/reviews?status=PENDING" className="adm-card flex items-center justify-between gap-3 p-5">
                <div>
                  <p className="text-base">{pendingReviews} {pendingReviews === 1 ? "review" : "reviews"} waiting</p>
                  <p className="mt-0.5 text-sm" style={{ color: "var(--adm-muted)" }}>
                    Approve them to show on your product pages.
                  </p>
                </div>
                <ArrowRight size={17} strokeWidth={1.6} />
              </Link>
            )}
            {draftCount > 0 && (
              <Link href="/admin/products?status=DRAFT" className="adm-card flex items-center justify-between gap-3 p-5">
                <div>
                  <p className="text-base">{draftCount} {draftCount === 1 ? "product is" : "products are"} still a draft</p>
                  <p className="mt-0.5 text-sm" style={{ color: "var(--adm-muted)" }}>
                    Drafts are not visible to customers yet.
                  </p>
                </div>
                <ArrowRight size={17} strokeWidth={1.6} />
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="adm-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base">Recent orders</h2>
            <Link href="/admin/orders" className="text-sm underline underline-offset-2" style={{ color: "var(--adm-muted)" }}>
              All orders
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <EmptyState
              title="No orders yet"
              description="When your first order comes in it will appear here."
            />
          ) : (
            <div className="adm-scroll">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <Link href={`/admin/orders/${order.id}`} className="underline underline-offset-2">
                          {order.orderNumber}
                        </Link>
                        <div className="text-xs" style={{ color: "var(--adm-muted)" }}>
                          {formatDate(order.placedAt)}
                        </div>
                      </td>
                      <td className="max-w-[10rem] truncate">{order.customerName}</td>
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

        <div className="adm-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Package size={16} strokeWidth={1.7} style={{ color: "var(--adm-accent)" }} />
            <h2 className="text-base">Best sellers</h2>
          </div>
          {bestSellers.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--adm-muted)" }}>
              Once you start selling, your top products will show here.
            </p>
          ) : (
            <ul className="space-y-3">
              {bestSellers.map((product) => (
                <li key={product.id} className="flex items-center gap-3">
                  <div className="relative h-11 w-10 shrink-0 overflow-hidden rounded-md" style={{ background: "var(--adm-bg)" }}>
                    {product.images[0] && (
                      <Image src={product.images[0].url} alt="" fill sizes="44px" className="object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/products/${product.id}`} className="block truncate text-sm underline underline-offset-2">
                      {product.name}
                    </Link>
                    <p className="text-xs" style={{ color: "var(--adm-muted)" }}>
                      {product.salesCount} sold · {stockOf(product)} in stock
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AdminPage>
  );
}
