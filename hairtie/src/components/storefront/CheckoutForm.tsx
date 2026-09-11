"use client";

import { useRouter } from "next/navigation";
import Script from "next/script";
import { useState } from "react";
import { Banknote, CreditCard, Lock } from "lucide-react";
import { placeOrder, type PlaceOrderResult } from "@/app/actions/checkout";
import { useToast } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Spinner";
import { formatPaise } from "@/lib/money";

const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh",
  "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry",
  "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
  "West Bengal",
];

type RazorpayOptions = Record<string, unknown>;
declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

export type CheckoutDefaults = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingLine1: string;
  shippingLine2: string;
  shippingCity: string;
  shippingState: string;
  shippingPincode: string;
};

export function CheckoutForm({
  defaults,
  signedIn,
  codEnabled,
  onlineEnabled,
  onlineConfigured,
  total,
}: {
  defaults: CheckoutDefaults;
  signedIn: boolean;
  codEnabled: boolean;
  onlineEnabled: boolean;
  onlineConfigured: boolean;
  total: number;
}) {
  const router = useRouter();
  const { show } = useToast();
  const online = onlineEnabled && onlineConfigured;
  const [method, setMethod] = useState<"COD" | "RAZORPAY">(online ? "RAZORPAY" : "COD");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setErrors({});

    const result: PlaceOrderResult = await placeOrder({
      customerName: form.get("customerName"),
      customerEmail: form.get("customerEmail"),
      customerPhone: form.get("customerPhone"),
      shippingLine1: form.get("shippingLine1"),
      shippingLine2: form.get("shippingLine2"),
      shippingCity: form.get("shippingCity"),
      shippingState: form.get("shippingState"),
      shippingPincode: form.get("shippingPincode"),
      customerNote: form.get("customerNote"),
      paymentMethod: method,
      saveAddress: form.get("saveAddress") === "on",
    });

    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      show(result.message, "error");
      setBusy(false);
      return;
    }

    if (result.mode === "cod") {
      router.push(`/order/${result.orderNumber}?placed=1`);
      return;
    }

    if (!window.Razorpay) {
      show("The payment window could not load. Please refresh and try again.", "error");
      setBusy(false);
      return;
    }

    const checkout = new window.Razorpay({
      key: result.razorpayKeyId,
      amount: result.amount,
      currency: "INR",
      name: result.storeName,
      description: `Order ${result.orderNumber}`,
      order_id: result.razorpayOrderId,
      prefill: result.prefill,
      theme: { color: "#8d6a5b" },
      handler: async (response: Record<string, string>) => {
        const verified = await fetch("/api/payments/razorpay/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderNumber: result.orderNumber, ...response }),
        }).then((r) => r.json());

        if (verified.ok) {
          router.push(`/order/${result.orderNumber}?placed=1`);
        } else {
          show(verified.message ?? "We could not confirm that payment.", "error");
          setBusy(false);
        }
      },
      modal: {
        ondismiss: async () => {
          await fetch(`/api/payments/razorpay/verify?orderNumber=${result.orderNumber}`, {
            method: "DELETE",
          }).catch(() => {});
          show("Payment cancelled — your bag has been kept.", "error");
          setBusy(false);
          router.refresh();
        },
      },
    });
    checkout.open();
  }

  return (
    <>
      {online && (
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="lazyOnload"
          onReady={() => setScriptReady(true)}
        />
      )}

      <form onSubmit={onSubmit} className="space-y-10">
        <section>
          <h2 className="text-xl">Contact details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Full name" name="customerName" defaultValue={defaults.customerName} error={errors.customerName} autoComplete="name" required />
            <Field label="Mobile number" name="customerPhone" defaultValue={defaults.customerPhone} error={errors.customerPhone} autoComplete="tel" inputMode="numeric" placeholder="10-digit number" required />
            <div className="sm:col-span-2">
              <Field label="Email address" name="customerEmail" type="email" defaultValue={defaults.customerEmail} error={errors.customerEmail} autoComplete="email" required />
            </div>
          </div>
          {!signedIn && (
            <p className="mt-3 text-xs" style={{ color: "var(--ht-muted)" }}>
              You can check out as a guest. Order updates go to this email and mobile number.
            </p>
          )}
        </section>

        <section>
          <h2 className="text-xl">Delivery address</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Address" name="shippingLine1" defaultValue={defaults.shippingLine1} error={errors.shippingLine1} autoComplete="address-line1" placeholder="House / flat, building, street" required />
            </div>
            <div className="sm:col-span-2">
              <Field label="Landmark / area (optional)" name="shippingLine2" defaultValue={defaults.shippingLine2} autoComplete="address-line2" />
            </div>
            <Field label="City" name="shippingCity" defaultValue={defaults.shippingCity} error={errors.shippingCity} autoComplete="address-level2" required />
            <div>
              <label className="ht-label" htmlFor="shippingState">State</label>
              <select
                id="shippingState"
                name="shippingState"
                defaultValue={defaults.shippingState}
                required
                className="ht-input"
              >
                <option value="">Choose a state</option>
                {INDIAN_STATES.map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
              {errors.shippingState && <FieldError message={errors.shippingState} />}
            </div>
            <Field label="Pincode" name="shippingPincode" defaultValue={defaults.shippingPincode} error={errors.shippingPincode} autoComplete="postal-code" inputMode="numeric" required />
          </div>

          {signedIn && (
            <label className="mt-4 flex items-center gap-2 text-sm">
              <input type="checkbox" name="saveAddress" defaultChecked className="h-4 w-4" />
              Save this address to my account
            </label>
          )}
        </section>

        <section>
          <h2 className="text-xl">Payment</h2>
          <div className="mt-4 space-y-3">
            {online && (
              <PaymentOption
                selected={method === "RAZORPAY"}
                onSelect={() => setMethod("RAZORPAY")}
                icon={<CreditCard size={18} strokeWidth={1.5} />}
                title="Pay online"
                description="UPI, cards, net banking and wallets — handled securely by Razorpay."
              />
            )}
            {codEnabled && (
              <PaymentOption
                selected={method === "COD"}
                onSelect={() => setMethod("COD")}
                icon={<Banknote size={18} strokeWidth={1.5} />}
                title="Cash on Delivery"
                description="Pay the delivery partner when your parcel arrives."
              />
            )}
          </div>

          {!online && onlineEnabled && !onlineConfigured && (
            <p className="mt-3 rounded-lg px-3 py-2 text-xs" style={{ background: "var(--ht-secondary)" }}>
              Online payment needs to be configured before it can be used. Add your Razorpay keys to the
              environment variables to switch it on.
            </p>
          )}
        </section>

        <section>
          <label className="ht-label" htmlFor="customerNote">Order note (optional)</label>
          <textarea id="customerNote" name="customerNote" rows={3} className="ht-input" placeholder="Anything we should know — gift wrap, delivery timing…" />
        </section>

        <div>
          <button type="submit" className="ht-btn ht-btn-primary w-full" disabled={busy || (method === "RAZORPAY" && !scriptReady)}>
            {busy ? <Spinner size={15} /> : <Lock size={15} strokeWidth={1.7} />}
            {method === "COD" ? `Place order · ${formatPaise(total)}` : `Pay ${formatPaise(total)}`}
          </button>
          <p className="mt-3 text-center text-xs" style={{ color: "var(--ht-muted)" }}>
            By placing this order you agree to our Terms & Conditions and Privacy Policy.
          </p>
        </div>
      </form>
    </>
  );
}

function Field({
  label,
  name,
  error,
  ...rest
}: { label: string; name: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="ht-label" htmlFor={name}>{label}</label>
      <input id={name} name={name} className="ht-input" aria-invalid={Boolean(error)} {...rest} />
      {error && <FieldError message={error} />}
    </div>
  );
}

function FieldError({ message }: { message: string }) {
  return (
    <p className="mt-1 text-xs" style={{ color: "#a33" }} role="alert">
      {message}
    </p>
  );
}

function PaymentOption({
  selected,
  onSelect,
  icon,
  title,
  description,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className="flex w-full items-start gap-3 p-4 text-left transition"
      style={{
        borderRadius: "calc(var(--ht-radius) * 0.7)",
        border: `1.5px solid ${selected ? "var(--ht-text)" : "var(--ht-border)"}`,
        background: selected ? "var(--ht-surface)" : "transparent",
      }}
    >
      <span
        className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full"
        style={{ border: `1.5px solid ${selected ? "var(--ht-text)" : "var(--ht-border)"}` }}
      >
        {selected && <span className="h-2 w-2 rounded-full" style={{ background: "var(--ht-text)" }} />}
      </span>
      <span className="flex-1">
        <span className="flex items-center gap-2 font-medium">
          {icon}
          {title}
        </span>
        <span className="mt-1 block text-sm" style={{ color: "var(--ht-muted)" }}>
          {description}
        </span>
      </span>
    </button>
  );
}
