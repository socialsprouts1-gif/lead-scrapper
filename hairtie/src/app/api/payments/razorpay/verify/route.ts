import { NextResponse } from "next/server";
import { z } from "zod";
import { mutate } from "@/lib/store";
import { verifyRazorpaySignature } from "@/lib/razorpay";
import { addOrderEvent, cancelUnpaidOrder, orderByNumber } from "@/lib/orders";

const schema = z.object({
  orderNumber: z.string().min(3),
  razorpay_order_id: z.string().min(3),
  razorpay_payment_id: z.string().min(3),
  razorpay_signature: z.string().min(3),
});

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Invalid payment response." }, { status: 400 });
  }
  const data = parsed.data;

  const order = orderByNumber(data.orderNumber);
  if (!order) return NextResponse.json({ ok: false, message: "Order not found." }, { status: 404 });

  // The signature is what proves the payment really happened — never trust the
  // browser's word for it.
  if (order.razorpayOrderId !== data.razorpay_order_id) {
    return NextResponse.json({ ok: false, message: "Payment does not match this order." }, { status: 400 });
  }

  const valid = verifyRazorpaySignature({
    razorpayOrderId: data.razorpay_order_id,
    razorpayPaymentId: data.razorpay_payment_id,
    signature: data.razorpay_signature,
  });

  if (!valid) {
    mutate((db) => {
      const stored = db.orders.find((entry) => entry.id === order.id);
      if (stored) stored.paymentStatus = "FAILED";
    });
    addOrderEvent(order.id, order.status, "Payment signature check failed.", "system");
    return NextResponse.json({ ok: false, message: "We could not verify that payment." }, { status: 400 });
  }

  if (order.paymentStatus === "PAID") {
    return NextResponse.json({ ok: true, orderNumber: order.orderNumber });
  }

  mutate((db) => {
    const stored = db.orders.find((entry) => entry.id === order.id);
    if (!stored) return;
    stored.paymentStatus = "PAID";
    stored.status = "CONFIRMED";
    stored.confirmedAt = new Date().toISOString();
    stored.razorpayPaymentId = data.razorpay_payment_id;
  });
  addOrderEvent(order.id, "CONFIRMED", "Payment received online.", "system");

  return NextResponse.json({ ok: true, orderNumber: order.orderNumber });
}

/** Called when the customer closes the Razorpay window without paying. */
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderNumber = searchParams.get("orderNumber");
  if (!orderNumber) return NextResponse.json({ ok: false }, { status: 400 });

  cancelUnpaidOrder(orderNumber);
  return NextResponse.json({ ok: true });
}
