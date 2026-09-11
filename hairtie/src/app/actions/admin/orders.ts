"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mutate } from "@/lib/store";
import { addOrderEvent, changeOrderStatus, orderById } from "@/lib/orders";
import type { OrderStatus, PaymentStatus } from "@/lib/types";
import type { AdminResult } from "@/app/actions/admin/products";

const STATUSES: OrderStatus[] = [
  "PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED",
  "CANCELLED", "RETURNED", "REFUNDED",
];

// With no sign-in there is no named admin, so changes are attributed to the shop.
const ACTOR = "Shop manager";

export async function setOrderStatus(orderId: string, status: string): Promise<AdminResult> {
  if (!STATUSES.includes(status as OrderStatus)) return { ok: false, message: "Unknown status." };
  try {
    changeOrderStatus(orderId, status as OrderStatus, ACTOR);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Could not update the order." };
  }
  revalidatePath("/admin/orders");
  return { ok: true, message: "Order updated." };
}

export async function setPaymentStatus(orderId: string, paymentStatus: string): Promise<AdminResult> {
  const valid: PaymentStatus[] = ["UNPAID", "PAID", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"];
  if (!valid.includes(paymentStatus as PaymentStatus)) {
    return { ok: false, message: "Unknown payment status." };
  }

  const order = orderById(orderId);
  if (!order) return { ok: false, message: "Order not found." };

  mutate((db) => {
    const stored = db.orders.find((entry) => entry.id === orderId);
    if (stored) stored.paymentStatus = paymentStatus as PaymentStatus;
  });
  addOrderEvent(
    orderId,
    order.status,
    `Payment marked as ${paymentStatus.toLowerCase().replace("_", " ")}.`,
    ACTOR,
  );

  revalidatePath("/admin/orders");
  return { ok: true, message: "Payment status updated." };
}

const shippingSchema = z.object({
  courierName: z.string().trim().max(80).optional().or(z.literal("")),
  trackingNumber: z.string().trim().max(80).optional().or(z.literal("")),
  trackingUrl: z.string().trim().max(500).optional().or(z.literal("")),
  markShipped: z.boolean().optional(),
});

export async function saveShipping(orderId: string, input: unknown): Promise<AdminResult> {
  const parsed = shippingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Please check the tracking details." };
  const data = parsed.data;

  mutate((db) => {
    const order = db.orders.find((entry) => entry.id === orderId);
    if (!order) return;
    order.courierName = data.courierName || null;
    order.trackingNumber = data.trackingNumber || null;
    order.trackingUrl = data.trackingUrl || null;
  });

  if (data.markShipped) {
    changeOrderStatus(
      orderId,
      "SHIPPED",
      ACTOR,
      data.trackingNumber
        ? `Shipped with ${data.courierName || "courier"} — tracking ${data.trackingNumber}.`
        : "Marked as shipped.",
    );
  }

  revalidatePath("/admin/orders");
  return { ok: true, message: data.markShipped ? "Marked as shipped." : "Tracking details saved." };
}

export async function saveOrderNote(orderId: string, note: string): Promise<AdminResult> {
  mutate((db) => {
    const order = db.orders.find((entry) => entry.id === orderId);
    if (order) order.adminNote = note.slice(0, 2000) || null;
  });
  revalidatePath("/admin/orders");
  return { ok: true, message: "Note saved." };
}

export async function recordRefund(
  orderId: string,
  amountRupees: number,
  reference: string,
): Promise<AdminResult> {
  const order = orderById(orderId);
  if (!order) return { ok: false, message: "Order not found." };

  const amount = Math.round(amountRupees * 100);
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, message: "Enter a valid refund amount." };
  if (amount > order.total) return { ok: false, message: "The refund is larger than the order total." };

  const full = amount >= order.total;

  // The refund itself is issued in the Razorpay dashboard or in cash; this
  // records it against the order so the books match.
  mutate((db) => {
    const stored = db.orders.find((entry) => entry.id === orderId);
    if (!stored) return;
    stored.refundAmount = amount;
    stored.refundId = reference.slice(0, 120) || null;
    stored.paymentStatus = full ? "REFUNDED" : "PARTIALLY_REFUNDED";
    if (full) stored.status = "REFUNDED";
  });

  addOrderEvent(
    orderId,
    full ? "REFUNDED" : order.status,
    `Refund of ₹${(amount / 100).toFixed(2)} recorded${reference ? ` (ref ${reference})` : ""}.`,
    ACTOR,
  );

  revalidatePath("/admin/orders");
  return { ok: true, message: "Refund recorded." };
}
