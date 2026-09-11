import Link from "next/link";
import { Suspense } from "react";
import { formatPaise } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE, allOrders } from "@/lib/orders";
import { AdminPage, EmptyState, PageHeader, Pagination, Pill } from "@/components/admin/ui";
import { FilterSelect, SearchInput } from "@/components/admin/Controls";

const PER_PAGE = 25;

export default async function AdminOrdersPage(props: PageProps<"/admin/orders">) {
  const params = await props.searchParams;

  const q = typeof params.q === "string" ? params.q.trim() : "";
  const status = typeof params.status === "string" ? params.status : "";
  const payment = typeof params.payment === "string" ? params.payment : "";
  const page = Math.max(Number(params.page ?? 1), 1);

  const everything = allOrders();
  const term = q.toLowerCase();

  const matched = everything.filter((order) => {
    if (q) {
      const hit =
        order.orderNumber.toLowerCase().includes(term) ||
        order.customerName.toLowerCase().includes(term) ||
        order.customerEmail.toLowerCase().includes(term) ||
        order.customerPhone.includes(q) ||
        order.shippingPincode.includes(q);
      if (!hit) return false;
    }
    if (status && order.status !== status) return false;
    if (payment && order.paymentStatus !== payment) return false;
    return true;
  });

  const total = matched.length;
  const orders = matched.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const pageCount = Math.ceil(total / PER_PAGE);
  const countFor = (value: string) => everything.filter((order) => order.status === value).length;

  function hrefFor(target: number) {
    const next = new URLSearchParams(
      Object.entries(params).flatMap(([key, value]) => (typeof value === "string" ? [[key, value]] : [])) as [string, string][],
    );
    next.set("page", String(target));
    return `/admin/orders?${next.toString()}`;
  }

  return (
    <AdminPage>
      <PageHeader
        title="Orders"
        description={`${countFor("PENDING")} new · ${countFor("PROCESSING")} being packed · ${countFor("SHIPPED")} on the way`}
      />

      <Suspense fallback={<div className="h-10" />}>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <SearchInput placeholder="Order number, name, phone or pincode" />
          <FilterSelect
            name="status"
            label="Order status"
            allLabel="All statuses"
            options={Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
          />
          <FilterSelect
            name="payment"
            label="Payment"
            allLabel="Any payment"
            options={[
              { value: "PAID", label: "Paid" },
              { value: "UNPAID", label: "Unpaid" },
              { value: "FAILED", label: "Failed" },
              { value: "REFUNDED", label: "Refunded" },
            ]}
          />
        </div>
      </Suspense>

      {orders.length === 0 ? (
        <EmptyState
          title={q || status ? "Nothing matched that" : "No orders yet"}
          description={
            q || status
              ? "Try a different search, or clear the filters."
              : "Your orders will show up here the moment someone buys something."
          }
        />
      ) : (
        <>
          <div className="adm-card">
            <div className="adm-scroll">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Payment</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <Link href={`/admin/orders/${order.id}`} className="font-medium underline underline-offset-2">
                          {order.orderNumber}
                        </Link>
                        <div className="text-xs" style={{ color: "var(--adm-muted)" }}>
                          {formatDate(order.placedAt, true)}
                        </div>
                      </td>
                      <td>
                        <div className="max-w-[12rem] truncate">{order.customerName}</div>
                        <div className="text-xs" style={{ color: "var(--adm-muted)" }}>
                          {order.customerPhone} · {order.shippingCity}
                        </div>
                      </td>
                      <td>{order.items.length}</td>
                      <td>{formatPaise(order.total)}</td>
                      <td>
                        <div className="text-xs">{order.paymentMethod === "COD" ? "COD" : "Online"}</div>
                        <div
                          className="text-xs"
                          style={{ color: order.paymentStatus === "PAID" ? "#356b40" : "var(--adm-muted)" }}
                        >
                          {order.paymentStatus === "PAID"
                            ? "Paid"
                            : order.paymentStatus === "UNPAID"
                              ? "Not paid"
                              : order.paymentStatus.toLowerCase().replace("_", " ")}
                        </div>
                      </td>
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
          <Pagination page={page} pageCount={pageCount} hrefFor={hrefFor} />
        </>
      )}
    </AdminPage>
  );
}
