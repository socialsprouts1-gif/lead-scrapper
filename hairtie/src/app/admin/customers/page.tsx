import Link from "next/link";
import { Suspense } from "react";
import { store } from "@/lib/store";
import { customerSummaries } from "@/lib/orders";
import { formatPaise } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { AdminPage, EmptyState, PageHeader, Pagination } from "@/components/admin/ui";
import { FilterSelect, SearchInput } from "@/components/admin/Controls";

const PER_PAGE = 25;

/**
 * There are no customer accounts, so this page is built from order history:
 * one row per email address, with everything they have bought. The newsletter
 * list lives alongside it.
 */
export default async function AdminCustomersPage(props: PageProps<"/admin/customers">) {
  const params = await props.searchParams;
  const q = typeof params.q === "string" ? params.q.trim().toLowerCase() : "";
  const filter = typeof params.filter === "string" ? params.filter : "";
  const page = Math.max(Number(params.page ?? 1), 1);

  const newsletter = store().newsletter;
  const subscribed = new Set(newsletter.map((entry) => entry.email));

  const matched = customerSummaries().filter((customer) => {
    if (q) {
      const hit =
        customer.name.toLowerCase().includes(q) ||
        customer.email.toLowerCase().includes(q) ||
        customer.phone.includes(q);
      if (!hit) return false;
    }
    if (filter === "repeat" && customer.orderCount < 2) return false;
    if (filter === "newsletter" && !subscribed.has(customer.email)) return false;
    return true;
  });

  const total = matched.length;
  const customers = matched.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const pageCount = Math.ceil(total / PER_PAGE);

  function hrefFor(target: number) {
    const next = new URLSearchParams(
      Object.entries(params).flatMap(([key, value]) =>
        typeof value === "string" ? [[key, value]] : [],
      ) as [string, string][],
    );
    next.set("page", String(target));
    return `/admin/customers?${next.toString()}`;
  }

  return (
    <AdminPage>
      <PageHeader
        title="Customers"
        description={`${total} ${total === 1 ? "person has" : "people have"} ordered from you. ${newsletter.length} on the mailing list.`}
      />

      <Suspense fallback={<div className="h-10" />}>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <SearchInput placeholder="Name, email or phone" />
          <FilterSelect
            name="filter"
            label="Show"
            allLabel="Everyone"
            options={[
              { value: "repeat", label: "Ordered more than once" },
              { value: "newsletter", label: "On the mailing list" },
            ]}
          />
        </div>
      </Suspense>

      {customers.length === 0 ? (
        <EmptyState
          title="No customers here yet"
          description="Everyone who places an order appears on this page, with what they have bought."
        />
      ) : (
        <>
          <div className="adm-card">
            <div className="adm-scroll">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Orders</th>
                    <th>Total spent</th>
                    <th>Last order</th>
                    <th>First order</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.key}>
                      <td>
                        <Link
                          href={`/admin/customers/${encodeURIComponent(customer.key)}`}
                          className="font-medium underline underline-offset-2"
                        >
                          {customer.name}
                        </Link>
                        <div className="text-xs" style={{ color: "var(--adm-muted)" }}>
                          {customer.email} · {customer.phone}
                        </div>
                      </td>
                      <td>{customer.orderCount}</td>
                      <td>{formatPaise(customer.totalSpent)}</td>
                      <td>{customer.lastOrderAt ? formatDate(customer.lastOrderAt) : "—"}</td>
                      <td>{customer.firstOrderAt ? formatDate(customer.firstOrderAt) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination page={page} pageCount={pageCount} hrefFor={hrefFor} />
        </>
      )}

      {newsletter.length > 0 && (
        <div className="adm-card mt-6 p-5">
          <h2 className="mb-3 text-base">Mailing list ({newsletter.length})</h2>
          <p className="mb-3 text-sm" style={{ color: "var(--adm-muted)" }}>
            People who signed up through the footer. Copy these into your email tool when you send a
            newsletter.
          </p>
          <textarea
            readOnly
            rows={4}
            className="adm-input font-mono text-xs"
            value={newsletter.map((entry) => entry.email).join(", ")}
          />
        </div>
      )}
    </AdminPage>
  );
}
