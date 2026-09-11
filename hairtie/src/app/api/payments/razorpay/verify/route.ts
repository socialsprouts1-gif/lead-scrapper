import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyRazorpaySignature } from "@/lib/razorpay";
import { restoreStock } from "@/lib/orders";

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

  const order = await prisma.order.findUnique({ where: { orderNumber: data.orderNumber } });
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
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "FAILED",
        events: {
          create: { status: order.status, message: "Payment signature check failed.", createdBy: "system" },
        },
      },
    });
    return NextResponse.json({ ok: false, message: "We could not verify that payment." }, { status: 400 });
  }

  if (order.paymentStatus === "PAID") {
    return NextResponse.json({ ok: true, orderNumber: order.orderNumber });
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: "PAID",
      status: "CONFIRMED",
      confirmedAt: new Date(),
      razorpayPaymentId: data.razorpay_payment_id,
      razorpaySignature: data.razorpay_signature,
      events: {
        create: { status: "CONFIRMED", message: "Payment received online.", createdBy: "system" },
      },
    },
  });

  return NextResponse.json({ ok: true, orderNumber: order.orderNumber });
}

/** Called when the customer closes the Razorpay window without paying. */
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderNumber = searchParams.get("orderNumber");
  if (!orderNumber) return NextResponse.json({ ok: false }, { status: 400 });

  const order = await prisma.order.findUnique({ where: { orderNumber } });
  if (!order || order.paymentStatus === "PAID") return NextResponse.json({ ok: true });

  await prisma.$transaction(async (tx) => {
    await restoreStock(order.id, tx);
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        paymentStatus: "FAILED",
        events: {
          create: { status: "CANCELLED", message: "Payment was not completed.", createdBy: "system" },
        },
      },
    });
  });

  return NextResponse.json({ ok: true });
}
