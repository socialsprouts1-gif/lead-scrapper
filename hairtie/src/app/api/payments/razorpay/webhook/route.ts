import { NextResponse } from "next/server";
import { mutate, store } from "@/lib/store";
import { addOrderEvent } from "@/lib/orders";
import { verifyRazorpayWebhook } from "@/lib/razorpay";

/**
 * Razorpay webhook endpoint.
 *
 * Configure it in the Razorpay dashboard at /api/payments/razorpay/webhook and
 * set RAZORPAY_WEBHOOK_SECRET. It is a safety net: if a customer closes the
 * browser after paying but before returning to the site, this still marks the
 * order paid.
 */
export async function POST(request: Request) {
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  const rawBody = await request.text();

  if (!verifyRazorpayWebhook(rawBody, signature)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let event: { event?: string; payload?: { payment?: { entity?: Record<string, unknown> } } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const payment = event.payload?.payment?.entity;
  const razorpayOrderId = typeof payment?.order_id === "string" ? payment.order_id : null;
  if (!razorpayOrderId) return NextResponse.json({ ok: true });

  const order = store().orders.find((entry) => entry.razorpayOrderId === razorpayOrderId);
  if (!order) return NextResponse.json({ ok: true });

  if (event.event === "payment.captured" && order.paymentStatus !== "PAID") {
    mutate((db) => {
      const stored = db.orders.find((entry) => entry.id === order.id);
      if (!stored) return;
      stored.paymentStatus = "PAID";
      if (stored.status === "PENDING") stored.status = "CONFIRMED";
      stored.confirmedAt = stored.confirmedAt ?? new Date().toISOString();
      if (typeof payment?.id === "string") stored.razorpayPaymentId = payment.id;
    });
    addOrderEvent(order.id, "CONFIRMED", "Payment captured (webhook).", "razorpay");
  }

  if (event.event === "payment.failed" && order.paymentStatus === "UNPAID") {
    mutate((db) => {
      const stored = db.orders.find((entry) => entry.id === order.id);
      if (stored) stored.paymentStatus = "FAILED";
    });
    addOrderEvent(order.id, order.status, "Payment failed (webhook).", "razorpay");
  }

  return NextResponse.json({ ok: true });
}
