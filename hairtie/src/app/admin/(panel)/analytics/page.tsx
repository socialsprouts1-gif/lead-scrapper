import Link from "next/link";
import { allOrders, customerSummaries } from "@/lib/orders";
import { allCategories, productById } from "@/lib/catalog";
import { getSiteSettings } from "@/lib/settings";
import { formatPaise } from "@/lib/money";
import { dayKeysBack, daysAgo } from "@/lib/dates";
import { AdminPage, EmptyState, PageHeader, StatCard } from "@/components/admin/ui";

const RANGES = [
  { days: 7, label: "Last 7 days" },
  { days: 30, label: "Last 30 days" },
  { days: 90, label: "Last 90 days" },
  { days: 365, label: "Last year" },
];

export default async function AdminAnalyticsPage(props: PageProps<"/admin/analytics">) {
  const params = await props.searchParams;
  const days = Number(params.days ?? 30);
  const range = RANGES.find((entry) => entry.days === days) ?? RANGES[1];
  const since = daysAgo(range.days);
  const settings = getSiteSettings();

  const everything = allOrders();
  const counted = everything.filter(
    (order) => order.status !== "CANCELLED" && new Date(order.placedAt) >= since,
  );

  // Best sellers and category totals, rolled up from the order lines.
  const byProduct = new Map<string, { name: string; units: number; revenue: number }>();
  const byCategory = new Map<string, { name: string; units: number; revenue: number }>();
  const categoryNames = new Map(allCategories().map((category) => [category.id, category.name]));

  for (const order of counted) {
    for (const item of order.items) {
      const product = byProduct.get(item.name) ?? { name: item.name, units: 0, revenue: 0 };
      product.units += item.quantity;
      product.revenue += item.lineTotal;
      byProduct.set(item.name, product);

      const categoryId = item.productId ? (productById(item.productId)?.categoryId ?? null) : null;
      const label = categoryId ? (categoryNames.get(categoryId) ?? "Uncategorised") : "Uncategorised";
      const category = byCategory.get(label) ?? { name: label, units: 0, revenue: 0 };
      category.units += item.quantity;
      category.revenue += item.lineTotal;
      byCategory.set(label, category);
    }
  }

  const topProducts = [...byProduct.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  const categoryTotals = [...byCategory.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8);

  const statusCounts = new Map<string, number>();
  for (const order of everything) {
    if (new Date(order.placedAt) < since) continue;
    statusCounts.set(order.status, (statusCounts.get(order.status) ?? 0) + 1);
  }

  const repeatCustomers = customerSummaries().filter((customer) => customer.orderCount > 1).length;

  const revenue = counted.reduce((sum, order) => sum + order.total, 0);
  const orderCount = counted.length;
  const average = orderCount > 0 ? Math.round(revenue / orderCount) : 0;

  // Revenue per day, bucketed by ISO date.
  const buckets = new Map<string, number>(dayKeysBack(range.days).map((key) => [key, 0]));
  for (const order of counted) {
    const key = order.placedAt.slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + order.total);
  }
  const series = [...buckets.entries()];
  const peak = Math.max(...series.map(([, value]) => value), 1);
  const maxCategoryRevenue = Math.max(...categoryTotals.map((row) => row.revenue), 1);

  return (
    <AdminPage>
      <PageHeader title="Analytics" description={`How your shop has done over the ${range.label.toLowerCase()}.`}>
        <div className="flex gap-1">
          {RANGES.map((entry) => (
            <Link
              key={entry.days}
              href={`/admin/analytics?days=${entry.days}`}
              className="adm-btn adm-btn-sm"
              style={{
                background: entry.days === range.days ? "var(--adm-accent-soft)" : "var(--adm-surface)",
                color: entry.days === range.days ? "var(--adm-accent)" : "var(--adm-text)",
                border: "1px solid var(--adm-line)",
              }}
            >
              {entry.label}
            </Link>
          ))}
        </div>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Revenue" value={formatPaise(revenue)} hint={range.label} />
        <StatCard label="Orders" value={String(orderCount)} hint={range.label} />
        <StatCard label="Average order" value={orderCount ? formatPaise(average) : "—"} />
        <StatCard
          label="Repeat customers"
          value={String(repeatCustomers)}
          hint="All time"
        />
      </div>

      {orderCount === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No sales in this period"
            description="Once orders start coming in, this page fills with revenue, best sellers and where your sales come from."
          />
        </div>
      ) : (
        <>
          <div className="adm-card mt-6 p-5">
            <h2 className="mb-4 text-base">Revenue per day</h2>
            <div className="flex h-40 items-end gap-[2px]" role="img" aria-label={`Daily revenue for the ${range.label.toLowerCase()}`}>
              {series.map(([day, value]) => (
                <div
                  key={day}
                  className="flex-1 rounded-t-sm transition"
                  title={`${day}: ${formatPaise(value)}`}
                  style={{
                    height: `${Math.max((value / peak) * 100, value > 0 ? 3 : 1)}%`,
                    background: value > 0 ? "var(--adm-accent)" : "var(--adm-line)",
                    minWidth: 2,
                  }}
                />
              ))}
            </div>
            <div className="mt-2 flex justify-between text-xs" style={{ color: "var(--adm-muted)" }}>
              <span>{series[0]?.[0]}</span>
              <span>Peak {formatPaise(peak)}</span>
              <span>{series[series.length - 1]?.[0]}</span>
            </div>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div className="adm-card p-5">
              <h2 className="mb-4 text-base">Best sellers</h2>
              <table className="adm-table">
                <thead>
                  <tr><th>Product</th><th>Units</th><th>Revenue</th></tr>
                </thead>
                <tbody>
                  {topProducts.map((row) => (
                    <tr key={row.name}>
                      <td className="max-w-[16rem] truncate">{row.name}</td>
                      <td>{row.units}</td>
                      <td>{formatPaise(row.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="adm-card p-5">
              <h2 className="mb-4 text-base">Sales by category</h2>
              <ul className="space-y-3">
                {categoryTotals.map((row) => (
                  <li key={row.name}>
                    <div className="flex justify-between text-sm">
                      <span>{row.name}</span>
                      <span style={{ color: "var(--adm-muted)" }}>
                        {formatPaise(row.revenue)} · {row.units} units
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--adm-bg)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(row.revenue / maxCategoryRevenue) * 100}%`, background: "var(--adm-accent)" }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="adm-card mt-5 p-5">
            <h2 className="mb-4 text-base">Orders by status</h2>
            <div className="flex flex-wrap gap-3">
              {[...statusCounts.entries()].map(([status, count]) => (
                <div key={status} className="rounded-lg px-4 py-3" style={{ background: "var(--adm-bg)" }}>
                  <p className="text-lg font-medium">{count}</p>
                  <p className="text-xs capitalize" style={{ color: "var(--adm-muted)" }}>
                    {status.toLowerCase()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="adm-card mt-6 p-5 text-sm">
        <h2 className="mb-2 text-base">Website traffic</h2>
        {settings.analytics.googleAnalyticsId ? (
          <p style={{ color: "var(--adm-muted)" }}>
            Google Analytics is connected ({settings.analytics.googleAnalyticsId}). Visitor numbers, traffic
            sources and behaviour live in your Google Analytics dashboard — this page covers sales.
          </p>
        ) : (
          <p style={{ color: "var(--adm-muted)" }}>
            The numbers above come from your own orders. To also see visitor traffic and where it comes from,
            add a Google Analytics ID in{" "}
            <Link href="/admin/settings" className="underline underline-offset-2">Store Settings</Link>.
          </p>
        )}
      </div>
    </AdminPage>
  );
}
