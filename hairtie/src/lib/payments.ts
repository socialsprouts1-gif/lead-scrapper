import "server-only";
import { mutate, store } from "@/lib/store";
import {
  DEFAULT_PAYMENT_SETTINGS,
  type CredentialSource,
  type PaymentSettings,
  type PaymentView,
} from "@/lib/payment-settings";

/**
 * Reads and writes the shop's payment configuration.
 *
 * Credentials entered in Admin → Payments win; if a field is left blank the
 * matching environment variable is used instead, so a deployment can still be
 * configured entirely through the hosting environment. Secrets live only here —
 * anything handed to a page goes through `paymentView()`.
 */

function merged(): PaymentSettings {
  const saved = store().payments;
  if (!saved) return { ...DEFAULT_PAYMENT_SETTINGS };
  return {
    ...DEFAULT_PAYMENT_SETTINGS,
    ...saved,
    razorpay: { ...DEFAULT_PAYMENT_SETTINGS.razorpay, ...(saved.razorpay ?? {}) },
  };
}

export function getPaymentSettings(): PaymentSettings {
  return merged();
}

/**
 * A patch may leave a secret out entirely, which means "keep what is stored".
 * An empty string means "clear it", which falls back to the environment.
 */
export type PaymentPatch = Omit<Partial<PaymentSettings>, "razorpay"> & {
  razorpay?: Partial<PaymentSettings["razorpay"]>;
};

export function savePaymentSettings(patch: PaymentPatch): PaymentSettings {
  return mutate((data) => {
    const current = merged();
    const next: PaymentSettings = {
      ...current,
      ...patch,
      razorpay: { ...current.razorpay, ...(patch.razorpay ?? {}) },
    };
    data.payments = next;
    return next;
  });
}

/** The credentials actually in force, and where each came from. */
export function razorpayCredentials() {
  const saved = merged().razorpay;
  const keyId = saved.keyId || process.env.RAZORPAY_KEY_ID || "";
  const keySecret = saved.keySecret || process.env.RAZORPAY_KEY_SECRET || "";
  const webhookSecret = saved.webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET || "";

  let source: CredentialSource = "none";
  if (saved.keyId && saved.keySecret) source = "admin";
  else if (keyId && keySecret) source = "environment";

  return { keyId, keySecret, webhookSecret, source };
}

/** The redacted view — the only payment data a page or component may receive. */
export function paymentView(): PaymentView {
  const settings = merged();
  const credentials = razorpayCredentials();
  const configured = Boolean(credentials.keyId && credentials.keySecret);

  return {
    codEnabled: settings.codEnabled,
    codFeePaise: settings.codFeePaise,
    codMinPaise: settings.codMinPaise,
    codMaxPaise: settings.codMaxPaise,
    onlineEnabled: settings.onlineEnabled,
    gateway: settings.gateway,
    testMode: settings.testMode,
    checkoutNote: settings.checkoutNote,
    razorpay: {
      keyId: credentials.keyId,
      hasKeySecret: Boolean(credentials.keySecret),
      hasWebhookSecret: Boolean(credentials.webhookSecret),
      source: credentials.source,
    },
    onlineReady: settings.onlineEnabled && configured,
  };
}

/** COD is offered only inside the order-value window the admin set. */
export function codAvailableFor(totalPaise: number) {
  const settings = merged();
  if (!settings.codEnabled) return false;
  if (totalPaise < settings.codMinPaise) return false;
  if (settings.codMaxPaise !== null && totalPaise > settings.codMaxPaise) return false;
  return true;
}
