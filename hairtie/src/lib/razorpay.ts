import "server-only";
import crypto from "node:crypto";
import { razorpayCredentials } from "@/lib/payments";

/**
 * Razorpay integration.
 *
 * Keys come from Admin → Payments, falling back to the environment when a
 * field is left blank. They are never sent to the browser, except the key id,
 * which Razorpay's own checkout script requires and which is safe to expose.
 * When keys are absent the storefront hides online payment and falls back to
 * Cash on Delivery — nothing pretends to work.
 */

export function razorpayConfigured() {
  const { keyId, keySecret } = razorpayCredentials();
  return Boolean(keyId && keySecret);
}

export function razorpayKeyId() {
  return razorpayCredentials().keyId;
}

/** Checks a key pair against Razorpay without creating anything. */
export async function testRazorpayKeys(keyId: string, keySecret: string) {
  if (!keyId || !keySecret) {
    return { ok: false as const, message: "Enter both the Key ID and the Key Secret first." };
  }
  try {
    const response = await fetch("https://api.razorpay.com/v1/payments?count=1", {
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      },
      cache: "no-store",
    });
    if (response.ok) {
      return { ok: true as const, message: "Connected. Razorpay accepted these keys." };
    }
    if (response.status === 401) {
      return { ok: false as const, message: "Razorpay rejected these keys. Check for a typo." };
    }
    return {
      ok: false as const,
      message: `Razorpay replied ${response.status}. Try again in a moment.`,
    };
  } catch {
    return {
      ok: false as const,
      message: "Could not reach Razorpay. Check this server's internet access.",
    };
  }
}

type RazorpayOrder = { id: string; amount: number; currency: string; status: string };

export async function createRazorpayOrder(params: {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  const { keyId, keySecret } = razorpayCredentials();
  if (!keyId || !keySecret) {
    throw new Error("Razorpay is not configured. Add its keys in Admin → Payments.");
  }

  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
    },
    body: JSON.stringify({
      amount: params.amountPaise,
      currency: "INR",
      receipt: params.receipt,
      notes: params.notes ?? {},
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Razorpay order creation failed (${response.status}): ${detail}`);
  }
  return (await response.json()) as RazorpayOrder;
}

/** Verifies the signature Razorpay returns after a successful payment. */
export function verifyRazorpaySignature(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature: string;
}) {
  const { keySecret } = razorpayCredentials();
  if (!keySecret) return false;
  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${params.razorpayOrderId}|${params.razorpayPaymentId}`)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(params.signature));
  } catch {
    return false;
  }
}

/** Verifies a Razorpay webhook payload against the configured webhook secret. */
export function verifyRazorpayWebhook(rawBody: string, signature: string) {
  const { webhookSecret } = razorpayCredentials();
  if (!webhookSecret) return false;
  const expected = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
