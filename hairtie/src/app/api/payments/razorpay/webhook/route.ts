import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
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

  const order = await prisma.order.findFirst({ where: { razorpayOrderId } });
  if (!order) return NextResponse.json({ ok: true });

  if (event.event === "payment.captured" && order.paymentStatus !== "PAID") {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "PAID",
        status: order.status === "PENDING" ? "CONFIRMED" : order.status,
        confirmedAt: order.confirmedAt ?? new Date(),
        razorpayPaymentId: typeof payment?.id === "string" ? payment.id : order.razorpayPaymentId,
        events: {
          create: { status: "CONFIRMED", message: "Payment captured (webhook).", createdBy: "razorpay" },
        },
      },
    });
  }

  if (event.event === "payment.failed" && order.paymentStatus === "UNPAID") {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "FAILED",
        events: {
          create: { status: order.status, message: "Payment failed (webhook).", createdBy: "razorpay" },
        },
      },
    });
  }

  return NextResponse.json({ ok: true });
}
