"use server";

import { z } from "zod";
import { mutate } from "@/lib/store";
import { getCart } from "@/lib/cart";
import { createOrderFromCart, findStockProblems } from "@/lib/orders";
import { createRazorpayOrder, razorpayConfigured, razorpayKeyId } from "@/lib/razorpay";
import { getSiteSettings } from "@/lib/settings";

const checkoutSchema = z.object({
  customerName: z.string().trim().min(2, "Please enter your full name.").max(80),
  customerEmail: z.email("Please enter a valid email address."),
  customerPhone: z
    .string()
    .trim()
    .regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, "Please enter a valid 10-digit Indian mobile number."),
  shippingLine1: z.string().trim().min(5, "Please enter your address.").max(160),
  shippingLine2: z.string().trim().max(160).optional().or(z.literal("")),
  shippingCity: z.string().trim().min(2, "Please enter your city.").max(60),
  shippingState: z.string().trim().min(2, "Please choose your state.").max(60),
  shippingPincode: z.string().trim().regex(/^\d{6}$/, "Please enter a valid 6-digit pincode."),
  customerNote: z.string().trim().max(500).optional().or(z.literal("")),
  paymentMethod: z.enum(["COD", "RAZORPAY"]),
});

export type PlaceOrderResult =
  | { ok: false; message: string; fieldErrors?: Record<string, string> }
  | { ok: true; mode: "cod"; orderNumber: string }
  | {
      ok: true;
      mode: "razorpay";
      orderNumber: string;
      razorpayOrderId: string;
      razorpayKeyId: string;
      amount: number;
      storeName: string;
      prefill: { name: string; email: string; contact: string };
    };

export async function placeOrder(input: unknown): Promise<PlaceOrderResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, message: "Please check the highlighted fields.", fieldErrors };
  }

  const details = parsed.data;
  const resolved = await getCart();
  const settings = getSiteSettings();

  if (!resolved || resolved.lines.filter((line) => !line.item.savedForLater).length === 0) {
    return { ok: false, message: "Your bag is empty." };
  }

  if (details.paymentMethod === "RAZORPAY" && (!settings.shipping.onlinePaymentEnabled || !razorpayConfigured())) {
    return {
      ok: false,
      message:
        "Online payment is not available right now. Please choose Cash on Delivery, or contact us on WhatsApp.",
    };
  }
  if (details.paymentMethod === "COD" && !settings.shipping.codEnabled) {
    return { ok: false, message: "Cash on Delivery is currently switched off." };
  }

  const problems = findStockProblems(resolved);
  if (problems.length > 0) {
    const first = problems[0];
    return {
      ok: false,
      message:
        first.available === 0
          ? `${first.name} is no longer available. Please remove it from your bag.`
          : `Only ${first.available} of ${first.name} left. Please reduce the quantity.`,
    };
  }

  let order;
  try {
    order = createOrderFromCart(resolved, details);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Could not place the order." };
  }

  if (details.paymentMethod === "COD") {
    return { ok: true, mode: "cod", orderNumber: order.orderNumber };
  }

  try {
    const razorpayOrder = await createRazorpayOrder({
      amountPaise: order.total,
      receipt: order.orderNumber,
      notes: { orderNumber: order.orderNumber },
    });
    mutate((data) => {
      const stored = data.orders.find((entry) => entry.id === order.id);
      if (stored) stored.razorpayOrderId = razorpayOrder.id;
    });

    return {
      ok: true,
      mode: "razorpay",
      orderNumber: order.orderNumber,
      razorpayOrderId: razorpayOrder.id,
      razorpayKeyId: razorpayKeyId(),
      amount: order.total,
      storeName: settings.storeName,
      prefill: {
        name: details.customerName,
        email: details.customerEmail,
        contact: details.customerPhone,
      },
    };
  } catch (error) {
    // The order exists but payment could not start — mark it so nobody ships it.
    mutate((data) => {
      const stored = data.orders.find((entry) => entry.id === order.id);
      if (!stored) return;
      stored.paymentStatus = "FAILED";
      stored.events.push({
        id: `${stored.id}-failed`,
        status: "PENDING",
        message: "Could not start the online payment. Customer was asked to retry.",
        createdBy: "system",
        createdAt: new Date().toISOString(),
      });
    });
    console.error("Razorpay order creation failed", error);
    return {
      ok: false,
      message:
        "We couldn't reach the payment gateway. Your order was not charged — please try again or choose Cash on Delivery.",
    };
  }
}
