/**
 * Payment settings — which ways a customer may pay, and the gateway keys.
 *
 * This module holds only the shape and the defaults so that client components
 * can import the *types*. The values themselves are read through
 * `src/lib/payments.ts`, which is server-only: gateway secrets are stored in
 * the shop's JSON document on the server and are never sent to the browser.
 * `PaymentView` is the redacted shape that is safe to hand to a page.
 */

export type GatewayId = "razorpay";

export const GATEWAYS: { id: GatewayId; label: string; blurb: string; docsUrl: string }[] = [
  {
    id: "razorpay",
    label: "Razorpay",
    blurb: "UPI, cards, net banking and wallets. Popular with Indian stores.",
    docsUrl: "https://dashboard.razorpay.com/app/keys",
  },
];

export type PaymentSettings = {
  /** Cash on Delivery. */
  codEnabled: boolean;
  codFeePaise: number;
  codMinPaise: number;
  codMaxPaise: number | null;

  /** Online payment through the chosen gateway. */
  onlineEnabled: boolean;
  gateway: GatewayId;
  testMode: boolean;

  /** Shown to the customer on the payment step. */
  checkoutNote: string;

  razorpay: {
    keyId: string;
    keySecret: string;
    webhookSecret: string;
  };
};

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  codEnabled: true,
  codFeePaise: 0,
  codMinPaise: 0,
  codMaxPaise: null,

  onlineEnabled: true,
  gateway: "razorpay",
  testMode: true,

  checkoutNote: "",

  razorpay: {
    keyId: "",
    keySecret: "",
    webhookSecret: "",
  },
};

/** Where a credential came from, so the admin screen can say so plainly. */
export type CredentialSource = "admin" | "environment" | "none";

/**
 * Everything a page may know about payments. Secrets are reduced to "is one
 * set?" — the values themselves never leave the server.
 */
export type PaymentView = {
  codEnabled: boolean;
  codFeePaise: number;
  codMinPaise: number;
  codMaxPaise: number | null;
  onlineEnabled: boolean;
  gateway: GatewayId;
  testMode: boolean;
  checkoutNote: string;
  razorpay: {
    /** The key id is public — Razorpay's own checkout script needs it. */
    keyId: string;
    hasKeySecret: boolean;
    hasWebhookSecret: boolean;
    source: CredentialSource;
  };
  /** True when an online payment can actually be taken right now. */
  onlineReady: boolean;
};

/** A live Razorpay key id starts rzp_test_ or rzp_live_. */
export function razorpayKeyLooksLive(keyId: string) {
  return keyId.startsWith("rzp_live_");
}
