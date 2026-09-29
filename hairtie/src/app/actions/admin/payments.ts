"use server";

import { denyUnlessAdmin } from "@/lib/admin-auth";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { savePaymentSettings, type PaymentPatch } from "@/lib/payments";
import { testRazorpayKeys } from "@/lib/razorpay";
import { razorpayCredentials } from "@/lib/payments";
import type { AdminResult } from "@/app/actions/admin/products";

/**
 * Payment settings, saved from Admin → Payments.
 *
 * Secrets travel one way only: the form posts a new value when the admin types
 * one, and leaves the field out when they don't, so a stored secret is never
 * sent to the browser just to be sent back again.
 */
const schema = z.object({
  codEnabled: z.boolean(),
  codFeeRupees: z.number().min(0).max(100000),
  codMinRupees: z.number().min(0).max(10000000),
  codMaxRupees: z.number().min(0).max(10000000).nullable(),

  onlineEnabled: z.boolean(),
  gateway: z.literal("razorpay"),
  testMode: z.boolean(),
  checkoutNote: z.string().max(400),

  razorpayKeyId: z.string().trim().max(120),
  /** Omitted = keep what is stored. Empty string = clear it. */
  razorpayKeySecret: z.string().max(200).optional(),
  razorpayWebhookSecret: z.string().max(200).optional(),
});

export async function updatePaymentSettings(input: unknown): Promise<AdminResult> {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Please check the payment settings and try again." };
  }
  const data = parsed.data;

  if (data.codMaxRupees !== null && data.codMaxRupees > 0 && data.codMaxRupees < data.codMinRupees) {
    return { ok: false, message: "The COD maximum cannot be lower than the minimum." };
  }

  const patch: PaymentPatch = {
    codEnabled: data.codEnabled,
    codFeePaise: Math.round(data.codFeeRupees * 100),
    codMinPaise: Math.round(data.codMinRupees * 100),
    codMaxPaise: data.codMaxRupees && data.codMaxRupees > 0 ? Math.round(data.codMaxRupees * 100) : null,
    onlineEnabled: data.onlineEnabled,
    gateway: data.gateway,
    testMode: data.testMode,
    checkoutNote: data.checkoutNote.trim(),
    razorpay: {
      keyId: data.razorpayKeyId,
      ...(data.razorpayKeySecret !== undefined ? { keySecret: data.razorpayKeySecret.trim() } : {}),
      ...(data.razorpayWebhookSecret !== undefined
        ? { webhookSecret: data.razorpayWebhookSecret.trim() }
        : {}),
    },
  };

  savePaymentSettings(patch);
  revalidatePath("/", "layout");
  return { ok: true, message: "Payment settings saved." };
}

/** Asks Razorpay whether the stored keys work. Nothing is charged. */
export async function testPaymentConnection(): Promise<AdminResult> {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;

  const { keyId, keySecret } = razorpayCredentials();
  const result = await testRazorpayKeys(keyId, keySecret);
  return { ok: result.ok, message: result.message };
}

/** Clears the stored gateway keys, falling back to environment variables. */
export async function clearGatewayKeys(): Promise<AdminResult> {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;

  savePaymentSettings({ razorpay: { keyId: "", keySecret: "", webhookSecret: "" } });
  revalidatePath("/", "layout");
  return {
    ok: true,
    message: "Keys cleared. Any keys set in the hosting environment will be used instead.",
  };
}
