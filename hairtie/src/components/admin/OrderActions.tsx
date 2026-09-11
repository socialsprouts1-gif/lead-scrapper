"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { recordRefund, saveOrderNote, saveShipping, setOrderStatus, setPaymentStatus } from "@/app/actions/admin/orders";
import { useToast } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Spinner";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";

type Status = keyof typeof ORDER_STATUS_LABELS;

export function OrderActions({
  orderId,
  status,
  paymentStatus,
  courierName,
  trackingNumber,
  trackingUrl,
  adminNote,
  total,
  refundAmount,
}: {
  orderId: string;
  status: Status;
  paymentStatus: string;
  courierName: string;
  trackingNumber: string;
  trackingUrl: string;
  adminNote: string;
  total: number;
  refundAmount: number;
}) {
  const router = useRouter();
  const { show } = useToast();
  const [pending, start] = useTransition();
  const [shipping, setShipping] = useState({ courierName, trackingNumber, trackingUrl });
  const [note, setNote] = useState(adminNote);
  const [refund, setRefund] = useState({ amount: "", reference: "" });

  function run(action: () => Promise<{ ok: boolean; message?: string }>) {
    start(async () => {
      const result = await action();
      if (result.message) show(result.message, result.ok ? "default" : "error");
      if (result.ok) router.refresh();
    });
  }

  const NEXT_STEPS: Partial<Record<Status, { label: string; to: Status }>> = {
    PENDING: { label: "Confirm this order", to: "CONFIRMED" },
    CONFIRMED: { label: "Start packing", to: "PROCESSING" },
    PROCESSING: { label: "Mark as shipped", to: "SHIPPED" },
    SHIPPED: { label: "Mark as delivered", to: "DELIVERED" },
  };
  const nextStep = NEXT_STEPS[status];

  return (
    <div className="space-y-5">
      <div className="adm-card p-5">
        <h2 className="text-base">What happens next</h2>
        {nextStep ? (
          <button
            type="button"
            className="adm-btn adm-btn-primary mt-3 w-full"
            disabled={pending}
            onClick={() => run(() => setOrderStatus(orderId, nextStep.to))}
          >
            {pending ? <Spinner size={14} /> : null} {nextStep.label}
          </button>
        ) : (
          <p className="mt-2 text-sm" style={{ color: "var(--adm-muted)" }}>
            This order is {ORDER_STATUS_LABELS[status].toLowerCase()}. Nothing else to do.
          </p>
        )}

        <div className="mt-4 space-y-2">
          <label className="adm-label" htmlFor="order-status">Or set the status yourself</label>
          <select
            id="order-status"
            className="adm-input"
            value={status}
            disabled={pending}
            onChange={(event) => run(() => setOrderStatus(orderId, event.target.value))}
          >
            {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <label className="adm-label mt-3" htmlFor="payment-status">Payment</label>
          <select
            id="payment-status"
            className="adm-input"
            value={paymentStatus}
            disabled={pending}
            onChange={(event) => run(() => setPaymentStatus(orderId, event.target.value))}
          >
            <option value="UNPAID">Not paid</option>
            <option value="PAID">Paid</option>
            <option value="FAILED">Failed</option>
            <option value="PARTIALLY_REFUNDED">Partly refunded</option>
            <option value="REFUNDED">Refunded</option>
          </select>
        </div>

        {status !== "CANCELLED" && status !== "DELIVERED" && (
          <button
            type="button"
            className="adm-btn adm-btn-danger mt-4 w-full"
            disabled={pending}
            onClick={() => {
              if (!window.confirm("Cancel this order? Stock will go back into your inventory.")) return;
              run(() => setOrderStatus(orderId, "CANCELLED"));
            }}
          >
            Cancel order
          </button>
        )}
      </div>

      <form
        className="adm-card space-y-3 p-5"
        onSubmit={(event) => {
          event.preventDefault();
          run(() => saveShipping(orderId, { ...shipping, markShipped: false }));
        }}
      >
        <h2 className="text-base">Shipping &amp; tracking</h2>
        <label className="block">
          <span className="adm-label">Courier</span>
          <input
            className="adm-input"
            value={shipping.courierName}
            onChange={(event) => setShipping({ ...shipping, courierName: event.target.value })}
            placeholder="Delhivery, Blue Dart…"
          />
        </label>
        <label className="block">
          <span className="adm-label">Tracking number</span>
          <input
            className="adm-input"
            value={shipping.trackingNumber}
            onChange={(event) => setShipping({ ...shipping, trackingNumber: event.target.value })}
          />
        </label>
        <label className="block">
          <span className="adm-label">Tracking link</span>
          <input
            className="adm-input"
            value={shipping.trackingUrl}
            onChange={(event) => setShipping({ ...shipping, trackingUrl: event.target.value })}
            placeholder="https://…"
          />
        </label>
        <div className="flex gap-2">
          <button type="submit" className="adm-btn adm-btn-ghost flex-1" disabled={pending}>Save</button>
          {status !== "SHIPPED" && status !== "DELIVERED" && (
            <button
              type="button"
              className="adm-btn adm-btn-primary flex-1"
              disabled={pending}
              onClick={() => run(() => saveShipping(orderId, { ...shipping, markShipped: true }))}
            >
              Save &amp; mark shipped
            </button>
          )}
        </div>
        <p className="adm-hint">
          The customer sees this on their order page and on Track Order.
        </p>
      </form>

      <form
        className="adm-card space-y-3 p-5"
        onSubmit={(event) => {
          event.preventDefault();
          run(() => saveOrderNote(orderId, note));
        }}
      >
        <h2 className="text-base">Private note</h2>
        <textarea
          rows={3}
          className="adm-input"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Only you and your staff see this."
        />
        <button type="submit" className="adm-btn adm-btn-ghost w-full" disabled={pending}>Save note</button>
      </form>

      <form
        className="adm-card space-y-3 p-5"
        onSubmit={(event) => {
          event.preventDefault();
          run(() => recordRefund(orderId, Number(refund.amount), refund.reference));
        }}
      >
        <h2 className="text-base">Record a refund</h2>
        <p className="text-xs" style={{ color: "var(--adm-muted)" }}>
          Issue the refund in your payment dashboard or in cash, then note it here so your records match.
          {refundAmount > 0 && ` ₹${(refundAmount / 100).toFixed(2)} has already been recorded.`}
        </p>
        <div className="flex gap-2">
          <label className="sr-only" htmlFor="refund-amount">Refund amount</label>
          <input
            id="refund-amount"
            className="adm-input"
            inputMode="decimal"
            placeholder={`Up to ₹${(total / 100).toFixed(2)}`}
            value={refund.amount}
            onChange={(event) => setRefund({ ...refund, amount: event.target.value })}
          />
          <label className="sr-only" htmlFor="refund-ref">Reference</label>
          <input
            id="refund-ref"
            className="adm-input"
            placeholder="Reference"
            value={refund.reference}
            onChange={(event) => setRefund({ ...refund, reference: event.target.value })}
          />
        </div>
        <button type="submit" className="adm-btn adm-btn-ghost w-full" disabled={pending || !refund.amount}>
          Record refund
        </button>
      </form>
    </div>
  );
}
