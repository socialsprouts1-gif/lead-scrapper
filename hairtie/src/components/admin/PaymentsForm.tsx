"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { Check, Eye, EyeOff, ShieldCheck, TriangleAlert } from "lucide-react";
import {
  clearGatewayKeys, testPaymentConnection, updatePaymentSettings,
} from "@/app/actions/admin/payments";
import { GATEWAYS, razorpayKeyLooksLive, type PaymentView } from "@/lib/payment-settings";
import { useToast } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Spinner";

/**
 * Admin → Payments.
 *
 * Secrets that are already stored are never loaded into this form — the server
 * only tells it *whether* one is set. Typing a new value replaces it; leaving
 * the field untouched keeps it.
 */
export function PaymentsForm({ initial }: { initial: PaymentView }) {
  const router = useRouter();
  const { show } = useToast();
  const [pending, start] = useTransition();
  const [testing, setTesting] = useState(false);

  const [codEnabled, setCodEnabled] = useState(initial.codEnabled);
  const [codFee, setCodFee] = useState(String(initial.codFeePaise / 100));
  const [codMin, setCodMin] = useState(String(initial.codMinPaise / 100));
  const [codMax, setCodMax] = useState(initial.codMaxPaise === null ? "" : String(initial.codMaxPaise / 100));

  const [onlineEnabled, setOnlineEnabled] = useState(initial.onlineEnabled);
  const [testMode, setTestMode] = useState(initial.testMode);
  const [checkoutNote, setCheckoutNote] = useState(initial.checkoutNote);

  const [keyId, setKeyId] = useState(initial.razorpay.keyId);
  const [keySecret, setKeySecret] = useState<string | null>(null);
  const [webhookSecret, setWebhookSecret] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  const gateway = GATEWAYS[0];
  const liveKey = razorpayKeyLooksLive(keyId);

  function save() {
    start(async () => {
      const result = await updatePaymentSettings({
        codEnabled,
        codFeeRupees: Number(codFee) || 0,
        codMinRupees: Number(codMin) || 0,
        codMaxRupees: codMax.trim() === "" ? null : Number(codMax) || 0,
        onlineEnabled,
        gateway: "razorpay",
        testMode,
        checkoutNote,
        razorpayKeyId: keyId.trim(),
        ...(keySecret !== null ? { razorpayKeySecret: keySecret } : {}),
        ...(webhookSecret !== null ? { razorpayWebhookSecret: webhookSecret } : {}),
      });
      show(result.message ?? "", result.ok ? "default" : "error");
      if (result.ok) {
        setKeySecret(null);
        setWebhookSecret(null);
        router.refresh();
      }
    });
  }

  async function test() {
    setTesting(true);
    const result = await testPaymentConnection();
    setTesting(false);
    show(result.message ?? "", result.ok ? "default" : "error");
  }

  return (
    <div className="space-y-6">
      <StatusCard view={initial} />

      {/* ---------------------------------------------------------------- */}
      <section className="adm-card p-6">
        <h2 className="text-base">Cash on Delivery</h2>
        <p className="adm-hint mb-4">
          The customer pays the delivery partner. Nothing to connect — this works straight away.
        </p>

        <label className="flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={codEnabled}
            onChange={(event) => setCodEnabled(event.target.checked)}
          />
          Offer Cash on Delivery at checkout
        </label>

        {codEnabled && (
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <Field label="Handling charge (₹)" hint="Added to COD orders. 0 for none.">
{(id) => (
              <input
                id={id}
                className="adm-input"
                inputMode="decimal"
                value={codFee}
                onChange={(event) => setCodFee(event.target.value)}
              />
)}
            </Field>
            <Field label="Minimum order (₹)" hint="COD is hidden below this.">
{(id) => (
              <input
                id={id}
                className="adm-input"
                inputMode="decimal"
                value={codMin}
                onChange={(event) => setCodMin(event.target.value)}
              />
)}
            </Field>
            <Field label="Maximum order (₹)" hint="Leave empty for no limit.">
{(id) => (
              <input
                id={id}
                className="adm-input"
                inputMode="decimal"
                placeholder="No limit"
                value={codMax}
                onChange={(event) => setCodMax(event.target.value)}
              />
)}
            </Field>
          </div>
        )}
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="adm-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base">Online payment</h2>
            <p className="adm-hint">{gateway.blurb}</p>
          </div>
          <a
            href={gateway.docsUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="adm-btn adm-btn-ghost adm-btn-sm"
          >
            Get your keys
          </a>
        </div>

        <div className="mt-4 space-y-3">
          <label className="flex items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={onlineEnabled}
              onChange={(event) => setOnlineEnabled(event.target.checked)}
            />
            Offer online payment (UPI, cards, net banking, wallets)
          </label>
          <label className="flex items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={testMode}
              onChange={(event) => setTestMode(event.target.checked)}
            />
            This is a test account — no real money moves
          </label>
        </div>

        <Field label="Gateway" hint="Only Razorpay is built in today.">
{(id) => (
          <select id={id} className="adm-input" value="razorpay" disabled>
            <option value="razorpay">{gateway.label}</option>
          </select>
)}
        </Field>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Key ID" hint="Safe to share — the checkout page uses it.">
{(id) => (
            <input
              id={id}
              className="adm-input"
              placeholder="rzp_test_xxxxxxxxxxxx"
              value={keyId}
              onChange={(event) => setKeyId(event.target.value)}
            />
)}
          </Field>

          <Field
            label="Key Secret"
            hint={
              initial.razorpay.hasKeySecret && keySecret === null
                ? "A secret is saved. Type a new one only if you want to replace it."
                : "Kept on the server. Never sent to a browser."
            }
          >
{(id) => (
            <div className="flex gap-2">
              <input
                id={id}
                className="adm-input font-mono"
                type={showSecret ? "text" : "password"}
                placeholder={initial.razorpay.hasKeySecret ? "•••••••••••••• (saved)" : "Paste the secret"}
                value={keySecret ?? ""}
                onChange={(event) => setKeySecret(event.target.value)}
              />
              <button
                type="button"
                className="adm-btn adm-btn-ghost adm-btn-sm shrink-0"
                onClick={() => setShowSecret((current) => !current)}
                aria-label={showSecret ? "Hide the secret" : "Show what you typed"}
              >
                {showSecret ? <EyeOff size={14} strokeWidth={1.7} /> : <Eye size={14} strokeWidth={1.7} />}
              </button>
            </div>
)}
          </Field>
        </div>

        <Field
          label="Webhook secret (optional)"
          hint={
            initial.razorpay.hasWebhookSecret && webhookSecret === null
              ? "A webhook secret is saved. Type a new one to replace it."
              : "Only needed if you set up a Razorpay webhook. It confirms payments even if the customer closes the tab."
          }
        >
{(id) => (
          <input
            id={id}
            className="adm-input font-mono"
            type="password"
            placeholder={initial.razorpay.hasWebhookSecret ? "•••••••••••••• (saved)" : "Paste the webhook secret"}
            value={webhookSecret ?? ""}
            onChange={(event) => setWebhookSecret(event.target.value)}
          />
)}
        </Field>

        {liveKey && testMode && (
          <p className="mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-xs" style={{ background: "#fbf0e2" }}>
            <TriangleAlert size={14} strokeWidth={1.8} className="mt-0.5 shrink-0" />
            That looks like a live key, but &ldquo;test account&rdquo; is still ticked. Untick it before
            you take real orders.
          </p>
        )}

        <Field label="Note shown at checkout (optional)" hint="A line of reassurance under the payment choices.">
{(id) => (
          <input
            id={id}
            className="adm-input"
            placeholder="All payments are processed securely. We never see your card details."
            value={checkoutNote}
            onChange={(event) => setCheckoutNote(event.target.value)}
          />
)}
        </Field>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="adm-btn adm-btn-primary" onClick={save} disabled={pending}>
          {pending ? <Spinner size={13} /> : null} Save payment settings
        </button>
        <button type="button" className="adm-btn adm-btn-ghost" onClick={test} disabled={testing}>
          {testing ? <Spinner size={13} /> : <ShieldCheck size={14} strokeWidth={1.7} />} Test connection
        </button>
        {initial.razorpay.source === "admin" && (
          <button
            type="button"
            className="adm-btn adm-btn-ghost"
            disabled={pending}
            onClick={() => {
              if (!window.confirm("Remove the saved keys? Online payment stops until you add them again.")) return;
              start(async () => {
                const result = await clearGatewayKeys();
                show(result.message ?? "", result.ok ? "default" : "error");
                if (result.ok) {
                  setKeyId("");
                  setKeySecret(null);
                  setWebhookSecret(null);
                  router.refresh();
                }
              });
            }}
          >
            Remove saved keys
          </button>
        )}
      </div>
    </div>
  );
}

function StatusCard({ view }: { view: PaymentView }) {
  const rows = [
    {
      label: "Cash on Delivery",
      ok: view.codEnabled,
      note: view.codEnabled
        ? view.codFeePaise > 0
          ? `On, with a ₹${(view.codFeePaise / 100).toFixed(0)} handling charge.`
          : "On, with no extra charge."
        : "Off — customers cannot pay on delivery.",
    },
    {
      label: "Online payment",
      ok: view.onlineReady,
      note: view.onlineReady
        ? view.testMode
          ? "Connected in test mode. No real money will move."
          : "Connected and taking live payments."
        : view.onlineEnabled
          ? "Switched on but not connected — add the Key ID and Key Secret below."
          : "Off — the option is hidden at checkout.",
    },
    {
      label: "Where the keys come from",
      ok: view.razorpay.source !== "none",
      note:
        view.razorpay.source === "admin"
          ? "Entered on this page and stored with your shop."
          : view.razorpay.source === "environment"
            ? "Read from this server's environment variables."
            : "No keys anywhere yet.",
    },
    {
      label: "Payment webhook",
      ok: view.razorpay.hasWebhookSecret,
      note: view.razorpay.hasWebhookSecret
        ? "Set up — payments confirm even if the customer closes the tab."
        : "Not set. Payments still confirm in the browser; this is a safety net.",
    },
  ];

  return (
    <div className="adm-card p-5">
      <h2 className="mb-3 text-base">Where things stand</h2>
      <ul className="space-y-3 text-sm">
        {rows.map((row) => (
          <li key={row.label} className="flex items-start gap-3">
            <span
              className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full"
              style={{ background: row.ok ? "#3f8a4f" : "#c49a3f", color: "#fff" }}
            >
              {row.ok ? <Check size={10} strokeWidth={3} /> : <span className="text-[9px] leading-none">!</span>}
            </span>
            <div>
              <p className="font-medium">{row.label}</p>
              <p style={{ color: "var(--adm-muted)" }}>{row.note}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Hands its generated id to the control it labels, so the two are associated. */
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: (id: string) => React.ReactNode;
}) {
  const id = useId();
  return (
    <div className="mt-4">
      <label className="adm-label" htmlFor={id}>{label}</label>
      {children(id)}
      {hint && <span className="adm-hint block">{hint}</span>}
    </div>
  );
}
