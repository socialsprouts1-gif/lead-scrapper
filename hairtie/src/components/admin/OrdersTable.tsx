"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { bulkOrderAction } from "@/app/actions/admin/orders";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE } from "@/lib/order-status";
import { formatPaise } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { Pill } from "@/components/admin/ui";
import { useToast } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Spinner";
import type { OrderStatus } from "@/lib/types";

export type OrderRow = {
  id: string;
  orderNumber: string;
  placedAt: string;
  customerName: string;
  customerPhone: string;
  city: string;
  itemCount: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  status: OrderStatus;
};

/** The statuses worth a one-click bulk change from the list. */
const BULK: { status: OrderStatus; label: string }[] = [
  { status: "CONFIRMED", label: "Confirm" },
  { status: "PROCESSING", label: "Mark packing" },
  { status: "SHIPPED", label: "Mark shipped" },
  { status: "DELIVERED", label: "Mark delivered" },
];

export function OrdersTable({ orders }: { orders: OrderRow[] }) {
  const router = useRouter();
  const { show } = useToast();
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, start] = useTransition();

  const allSelected = orders.length > 0 && selected.length === orders.length;

  function apply(status: OrderStatus) {
    start(async () => {
      const result = await bulkOrderAction(selected, status);
      show(result.message ?? "", result.ok ? "default" : "error");
      if (result.ok) {
        setSelected([]);
        router.refresh();
      }
    });
  }

  return (
    <div className="adm-card">
      {selected.length > 0 && (
        <div
          className="flex flex-wrap items-center gap-2 border-b px-4 py-3 text-sm"
          style={{ borderColor: "var(--adm-line)", background: "var(--adm-accent-soft)" }}
        >
          <span className="mr-2 font-medium">{selected.length} selected</span>
          {BULK.map((entry) => (
            <button
              key={entry.status}
              type="button"
              className="adm-btn adm-btn-ghost adm-btn-sm"
              disabled={pending}
              onClick={() => apply(entry.status)}
            >
              {entry.label}
            </button>
          ))}
          <button
            type="button"
            className="adm-btn adm-btn-ghost adm-btn-sm"
            disabled={pending}
            onClick={() => {
              if (!window.confirm(`Cancel ${selected.length} order(s)? Stock goes back on the shelf.`)) return;
              apply("CANCELLED");
            }}
            style={{ color: "#9c3a3a" }}
          >
            Cancel orders
          </button>
          {pending && <Spinner size={13} />}
          <button
            type="button"
            className="ml-auto text-xs underline underline-offset-2"
            onClick={() => setSelected([])}
          >
            Clear
          </button>
        </div>
      )}

      <div className="adm-scroll">
        <table className="adm-table">
          <thead>
            <tr>
              <th style={{ width: "2.5rem" }}>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  aria-label="Select every order on this page"
                  checked={allSelected}
                  onChange={(event) => setSelected(event.target.checked ? orders.map((o) => o.id) : [])}
                />
              </th>
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
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    aria-label={`Select order ${order.orderNumber}`}
                    checked={selected.includes(order.id)}
                    onChange={(event) =>
                      setSelected((current) =>
                        event.target.checked
                          ? [...current, order.id]
                          : current.filter((id) => id !== order.id),
                      )
                    }
                  />
                </td>
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
                    {order.customerPhone} · {order.city}
                  </div>
                </td>
                <td>{order.itemCount}</td>
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
  );
}
