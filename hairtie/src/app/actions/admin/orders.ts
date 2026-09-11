"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAdminOrNull } from "@/lib/auth";
import { changeOrderStatus } from "@/lib/orders";
import type { OrderStatus, PaymentStatus } from "@/generated/prisma/enums";
import type { AdminResult } from "@/app/actions/admin/products";

async function guard() {
  const admin = await getAdminOrNull();
  if (!admin) throw new Error("Not authorised.");
  return admin;
}

const STATUSES = [
  "PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED",
  "CANCELLED", "RETURNED", "REFUNDED",
] as const;

export async function setOrderStatus(orderId: string, status: string): Promise<AdminResult> {
  const admin = await guard();
  if (!STATUSES.includes(status as OrderStatus)) return { ok: false, message: "Unknown status." };

  try {
    await changeOrderStatus(orderId, status as OrderStatus, admin.name);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Could not update the order." };
  }

  revalidatePath("/admin/orders");
  return { ok: true, message: "Order updated." };
}

export async function setPaymentStatus(orderId: string, paymentStatus: string): Promise<AdminResult> {
  const admin = await guard();
  const valid: PaymentStatus[] = ["UNPAID", "PAID", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"];
  if (!valid.includes(paymentStatus as PaymentStatus)) return { ok: false, message: "Unknown payment status." };

  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true } });
  if (!order) return { ok: false, message: "Order not found." };

  await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentStatus: paymentStatus as PaymentStatus,
      events: {
        create: {
          status: order.status,
          message: `Payment marked as ${paymentStatus.toLowerCase().replace("_", " ")}.`,
          createdBy: admin.name,
        },
      },
    },
  });

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
  const admin = await guard();
  const parsed = shippingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Please check the tracking details." };
  const data = parsed.data;

  await prisma.order.update({
    where: { id: orderId },
    data: {
      courierName: data.courierName || null,
      trackingNumber: data.trackingNumber || null,
      trackingUrl: data.trackingUrl || null,
    },
  });

  if (data.markShipped) {
    await changeOrderStatus(
      orderId,
      "SHIPPED",
      admin.name,
      data.trackingNumber
        ? `Shipped with ${data.courierName || "courier"} — tracking ${data.trackingNumber}.`
        : "Marked as shipped.",
    );
  }

  revalidatePath("/admin/orders");
  return { ok: true, message: data.markShipped ? "Marked as shipped." : "Tracking details saved." };
}

export async function saveOrderNote(orderId: string, note: string): Promise<AdminResult> {
  await guard();
  await prisma.order.update({
    where: { id: orderId },
    data: { adminNote: note.slice(0, 2000) || null },
  });
  revalidatePath("/admin/orders");
  return { ok: true, message: "Note saved." };
}

export async function recordRefund(orderId: string, amountRupees: number, reference: string): Promise<AdminResult> {
  const admin = await guard();
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, message: "Order not found." };

  const amount = Math.round(amountRupees * 100);
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, message: "Enter a valid refund amount." };
  if (amount > order.total) return { ok: false, message: "The refund is larger than the order total." };

  // The refund itself is issued in the Razorpay dashboard or in cash; this
  // records it against the order so the books match.
  await prisma.order.update({
    where: { id: orderId },
    data: {
      refundAmount: amount,
      refundId: reference.slice(0, 120) || null,
      paymentStatus: amount >= order.total ? "REFUNDED" : "PARTIALLY_REFUNDED",
      status: amount >= order.total ? "REFUNDED" : order.status,
      events: {
        create: {
          status: amount >= order.total ? "REFUNDED" : order.status,
          message: `Refund of ₹${(amount / 100).toFixed(2)} recorded${reference ? ` (ref ${reference})` : ""}.`,
          createdBy: admin.name,
        },
      },
    },
  });

  revalidatePath("/admin/orders");
  return { ok: true, message: "Refund recorded." };
}
