import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import type { Prisma } from "@/generated/prisma/client";
import { formatPaise } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { AdminPage, EmptyState, PageHeader, Pagination, Pill } from "@/components/admin/ui";
import { FilterSelect, SearchInput } from "@/components/admin/Controls";

const PER_PAGE = 25;

export default async function AdminCustomersPage(props: PageProps<"/admin/customers">) {
  await requireAdmin();
  const params = await props.searchParams;

  const q = typeof params.q === "string" ? params.q.trim() : "";
  const filter = typeof params.filter === "string" ? params.filter : "";
  const page = Math.max(Number(params.page ?? 1), 1);

  const and: Prisma.UserWhereInput[] = [{ role: "CUSTOMER" }];
  if (q) {
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
      ],
    });
  }
  if (filter === "blocked") and.push({ status: "BLOCKED" });
  if (filter === "buyers") and.push({ orders: { some: {} } });
  if (filter === "newsletter") and.push({ notes: { contains: "newsletter" } });

  const where: Prisma.UserWhereInput = { AND: and };

  const [customers, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true, name: true, email: true, phone: true, status: true, createdAt: true, notes: true,
        orders: {
          where: { status: { notIn: ["CANCELLED"] } },
          select: { total: true, placedAt: true },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const pageCount = Math.ceil(total / PER_PAGE);

  function hrefFor(target: number) {
    const next = new URLSearchParams(
      Object.entries(params).flatMap(([key, value]) => (typeof value === "string" ? [[key, value]] : [])) as [string, string][],
    );
    next.set("page", String(target));
    return `/admin/customers?${next.toString()}`;
  }

  return (
    <AdminPage>
      <PageHeader title="Customers" description={`${total} ${total === 1 ? "person" : "people"}`} />

      <Suspense fallback={<div className="h-10" />}>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <SearchInput placeholder="Name, email or phone" />
          <FilterSelect
            name="filter"
            label="Show"
            allLabel="Everyone"
            options={[
              { value: "buyers", label: "Has ordered" },
              { value: "newsletter", label: "On the mailing list" },
              { value: "blocked", label: "Blocked" },
            ]}
          />
        </div>
      </Suspense>

      {customers.length === 0 ? (
        <EmptyState
          title="No customers here yet"
          description="Accounts and newsletter sign-ups will appear on this page."
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
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => {
                    const spent = customer.orders.reduce((sum, order) => sum + order.total, 0);
                    const last = customer.orders
                      .map((order) => order.placedAt)
                      .sort((a, b) => b.getTime() - a.getTime())[0];
                    return (
                      <tr key={customer.id}>
                        <td>
                          <Link href={`/admin/customers/${customer.id}`} className="font-medium underline underline-offset-2">
                            {customer.name}
                          </Link>
                          <div className="text-xs" style={{ color: "var(--adm-muted)" }}>
                            {customer.email}
                            {customer.phone ? ` · ${customer.phone}` : ""}
                          </div>
                          <div className="mt-1 flex gap-1.5">
                            {customer.status === "BLOCKED" && <Pill label="Blocked" bg="#f6e7e7" color="#8a3c3c" />}
                            {customer.notes?.includes("newsletter") && <Pill label="Mailing list" bg="#eef1f6" color="#41567f" />}
                          </div>
                        </td>
                        <td>{customer.orders.length}</td>
                        <td>{formatPaise(spent)}</td>
                        <td>{last ? formatDate(last) : "—"}</td>
                        <td>{formatDate(customer.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination page={page} pageCount={pageCount} hrefFor={hrefFor} />
        </>
      )}
    </AdminPage>
  );
}
