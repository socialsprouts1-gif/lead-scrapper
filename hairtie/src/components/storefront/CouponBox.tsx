"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { applyCoupon, removeCoupon } from "@/app/actions/cart";
import { useToast } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Spinner";

export function CouponBox({
  appliedCode,
  appliedLabel,
  error,
}: {
  appliedCode: string | null;
  appliedLabel: string | null;
  error: string | null;
}) {
  const { show } = useToast();
  const [pending, start] = useTransition();

  if (appliedCode) {
    return (
      <div
        className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm"
        style={{ background: "var(--ht-secondary)" }}
      >
        <span>
          <strong>{appliedCode}</strong>
          {appliedLabel ? ` · ${appliedLabel}` : ""}
        </span>
        <button
          type="button"
          onClick={() =>
            start(async () => {
              const result = await removeCoupon();
              if (result.message) show(result.message);
            })
          }
          disabled={pending}
          aria-label="Remove coupon"
          className="p-1"
        >
          {pending ? <Spinner size={13} /> : <X size={15} strokeWidth={1.7} />}
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const code = String(new FormData(event.currentTarget).get("code") ?? "");
        start(async () => {
          const result = await applyCoupon(code);
          if (result.message) show(result.message, result.ok ? "default" : "error");
        });
      }}
      className="space-y-2"
    >
      <label className="ht-label" htmlFor="coupon">Have a coupon?</label>
      <div className="flex gap-2">
        <input id="coupon" name="code" placeholder="Enter code" className="ht-input flex-1 uppercase" autoComplete="off" />
        <button type="submit" className="ht-btn ht-btn-outline" disabled={pending}>
          {pending ? <Spinner size={14} /> : "Apply"}
        </button>
      </div>
      {error && (
        <p className="text-xs" style={{ color: "#a33" }}>{error}</p>
      )}
    </form>
  );
}
