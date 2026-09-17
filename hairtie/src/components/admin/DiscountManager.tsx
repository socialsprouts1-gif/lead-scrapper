"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { deleteCoupon, saveCoupon, toggleCoupon } from "@/app/actions/admin/misc";
import { useToast } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Spinner";
import { formatPaise } from "@/lib/money";
import { formatDate } from "@/lib/utils";

export type CouponRow = {
  id: string;
  code: string;
  description: string | null;
  type: "PERCENT" | "FIXED";
  value: number;
  minOrderValue: number;
  maxDiscount: number | null;
  scope: "ALL" | "PRODUCTS" | "CATEGORIES";
  categoryIds: string[];
  productIds: string[];
  firstOrderOnly: boolean;
  usageLimit: number | null;
  perUserLimit: number;
  usageCount: number;
  expiresAt: string | null;
  isActive: boolean;
};

type Draft = {
  id?: string;
  code: string;
  description: string;
  type: "PERCENT" | "FIXED";
  value: string;
  minOrderValue: string;
  maxDiscount: string;
  scope: "ALL" | "PRODUCTS" | "CATEGORIES";
  categoryIds: string[];
  productIds: string[];
  firstOrderOnly: boolean;
  usageLimit: string;
  perUserLimit: string;
  expiresAt: string;
  isActive: boolean;
};

const BLANK: Draft = {
  code: "", description: "", type: "PERCENT", value: "10", minOrderValue: "",
  maxDiscount: "", scope: "ALL", categoryIds: [], productIds: [],
  firstOrderOnly: false, usageLimit: "", perUserLimit: "1", expiresAt: "", isActive: true,
};

export function DiscountManager({
  coupons,
  categories,
}: {
  coupons: CouponRow[];
  categories: { id: string; name: string; parentId: string | null }[];
}) {
  const router = useRouter();
  const { show } = useToast();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pending, start] = useTransition();

  function run(action: () => Promise<{ ok: boolean; message?: string }>) {
    start(async () => {
      const result = await action();
      if (result.message) show(result.message, result.ok ? "default" : "error");
      if (result.ok) {
        setDraft(null);
        router.refresh();
      }
    });
  }

  function toDraft(coupon: CouponRow): Draft {
    return {
      id: coupon.id,
      code: coupon.code,
      description: coupon.description ?? "",
      type: coupon.type,
      value: coupon.type === "PERCENT" ? String(coupon.value) : String(coupon.value / 100),
      minOrderValue: coupon.minOrderValue ? String(coupon.minOrderValue / 100) : "",
      maxDiscount: coupon.maxDiscount ? String(coupon.maxDiscount / 100) : "",
      scope: coupon.scope,
      categoryIds: coupon.categoryIds,
      productIds: coupon.productIds,
      firstOrderOnly: coupon.firstOrderOnly,
      usageLimit: coupon.usageLimit ? String(coupon.usageLimit) : "",
      perUserLimit: String(coupon.perUserLimit),
      expiresAt: coupon.expiresAt ? coupon.expiresAt.slice(0, 10) : "",
      isActive: coupon.isActive,
    };
  }

  function summary(coupon: CouponRow) {
    const amount =
      coupon.type === "PERCENT"
        ? `${coupon.value}% off${coupon.maxDiscount ? ` up to ${formatPaise(coupon.maxDiscount)}` : ""}`
        : `${formatPaise(coupon.value)} off`;
    const conditions = [
      coupon.minOrderValue > 0 ? `orders over ${formatPaise(coupon.minOrderValue)}` : null,
      coupon.scope === "CATEGORIES" ? "selected categories" : null,
      coupon.scope === "PRODUCTS" ? "selected products" : null,
      coupon.firstOrderOnly ? "first order only" : null,
    ].filter(Boolean);
    return conditions.length ? `${amount} · ${conditions.join(", ")}` : amount;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start">
      <div className="space-y-3">
        {coupons.length === 0 ? (
          <div className="adm-card px-6 py-14 text-center">
            <p className="text-lg font-medium">No discounts yet</p>
            <p className="mx-auto mt-2 max-w-sm text-sm" style={{ color: "var(--adm-muted)" }}>
              Create a code and share it on Instagram or with your regulars.
            </p>
            <button type="button" className="adm-btn adm-btn-primary mt-5" onClick={() => setDraft(BLANK)}>
              <Plus size={15} strokeWidth={1.8} /> New discount
            </button>
          </div>
        ) : (
          coupons.map((coupon) => {
            const expired = coupon.expiresAt && new Date(coupon.expiresAt) < new Date();
            const usedUp = coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit;
            return (
              <div key={coupon.id} className="adm-card flex flex-wrap items-center gap-4 p-5">
                <div className="min-w-[12rem] flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-medium tracking-wide">{coupon.code}</span>
                    {!coupon.isActive && <span className="adm-pill" style={{ background: "#eeeae5", color: "#6b6058" }}>Off</span>}
                    {expired && <span className="adm-pill" style={{ background: "#f6e7e7", color: "#8a3c3c" }}>Expired</span>}
                    {usedUp && <span className="adm-pill" style={{ background: "#f6e7e7", color: "#8a3c3c" }}>Fully used</span>}
                  </div>
                  <p className="mt-1 text-sm" style={{ color: "var(--adm-muted)" }}>{summary(coupon)}</p>
                  <p className="mt-1 text-xs" style={{ color: "var(--adm-muted)" }}>
                    Used {coupon.usageCount}
                    {coupon.usageLimit ? ` of ${coupon.usageLimit}` : ""} times
                    {coupon.expiresAt ? ` · ends ${formatDate(coupon.expiresAt)}` : ""}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    className="adm-btn adm-btn-ghost adm-btn-sm"
                    disabled={pending}
                    onClick={() => run(() => toggleCoupon(coupon.id, !coupon.isActive))}
                  >
                    {coupon.isActive ? "Switch off" : "Switch on"}
                  </button>
                  <button type="button" className="rounded-md p-2" aria-label={`Edit ${coupon.code}`} onClick={() => setDraft(toDraft(coupon))}>
                    <Pencil size={15} strokeWidth={1.7} />
                  </button>
                  <button
                    type="button"
                    className="rounded-md p-2"
                    aria-label={`Delete ${coupon.code}`}
                    style={{ color: "#9c3a3a" }}
                    onClick={() => {
                      if (!window.confirm(`Delete the code ${coupon.code}?`)) return;
                      run(() => deleteCoupon(coupon.id));
                    }}
                  >
                    <Trash2 size={15} strokeWidth={1.7} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="adm-card p-6 lg:sticky lg:top-6">
        {draft ? (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              run(() => saveCoupon(draft, draft.id));
            }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg">{draft.id ? "Edit discount" : "New discount"}</h2>
              <button type="button" className="text-sm underline underline-offset-2" onClick={() => setDraft(null)}>
                Cancel
              </button>
            </div>

            <label className="block">
              <span className="adm-label">Code</span>
              <input
                className="adm-input font-mono uppercase"
                value={draft.code}
                required
                onChange={(event) => setDraft({ ...draft, code: event.target.value.toUpperCase().replace(/\s/g, "") })}
                placeholder="WELCOME10"
              />
              <span className="adm-hint block">This is what customers type at checkout.</span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="adm-label">Type</span>
                <select
                  className="adm-input"
                  value={draft.type}
                  onChange={(event) => setDraft({ ...draft, type: event.target.value as Draft["type"] })}
                >
                  <option value="PERCENT">Percentage off</option>
                  <option value="FIXED">Fixed amount off</option>
                </select>
              </label>
              <label className="block">
                <span className="adm-label">{draft.type === "PERCENT" ? "Percent (%)" : "Amount (₹)"}</span>
                <input
                  className="adm-input"
                  inputMode="decimal"
                  value={draft.value}
                  required
                  onChange={(event) => setDraft({ ...draft, value: event.target.value })}
                />
              </label>
            </div>

            {draft.type === "PERCENT" && (
              <label className="block">
                <span className="adm-label">Maximum discount (₹)</span>
                <input
                  className="adm-input"
                  inputMode="decimal"
                  value={draft.maxDiscount}
                  onChange={(event) => setDraft({ ...draft, maxDiscount: event.target.value })}
                  placeholder="Leave blank for no cap"
                />
              </label>
            )}

            <label className="block">
              <span className="adm-label">Minimum order (₹)</span>
              <input
                className="adm-input"
                inputMode="decimal"
                value={draft.minOrderValue}
                onChange={(event) => setDraft({ ...draft, minOrderValue: event.target.value })}
                placeholder="Any amount"
              />
            </label>

            <label className="block">
              <span className="adm-label">Applies to</span>
              <select
                className="adm-input"
                value={draft.scope}
                onChange={(event) => setDraft({ ...draft, scope: event.target.value as Draft["scope"] })}
              >
                <option value="ALL">Everything in the shop</option>
                <option value="CATEGORIES">Only certain categories</option>
              </select>
            </label>

            {draft.scope === "CATEGORIES" && (
              <div>
                <span className="adm-label">Categories</span>
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg p-2" style={{ background: "var(--adm-bg)" }}>
                  {categories.map((category) => (
                    <label key={category.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={draft.categoryIds.includes(category.id)}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            categoryIds: event.target.checked
                              ? [...draft.categoryIds, category.id]
                              : draft.categoryIds.filter((id) => id !== category.id),
                          })
                        }
                      />
                      {category.parentId ? `— ${category.name}` : category.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="adm-label">Total uses</span>
                <input
                  className="adm-input"
                  inputMode="numeric"
                  value={draft.usageLimit}
                  onChange={(event) => setDraft({ ...draft, usageLimit: event.target.value })}
                  placeholder="Unlimited"
                />
              </label>
              <label className="block">
                <span className="adm-label">Per customer</span>
                <input
                  className="adm-input"
                  inputMode="numeric"
                  value={draft.perUserLimit}
                  onChange={(event) => setDraft({ ...draft, perUserLimit: event.target.value })}
                />
              </label>
            </div>

            <label className="block">
              <span className="adm-label">Ends on</span>
              <input
                type="date"
                className="adm-input"
                value={draft.expiresAt}
                onChange={(event) => setDraft({ ...draft, expiresAt: event.target.value })}
              />
              <span className="adm-hint block">Leave blank to run until you switch it off.</span>
            </label>

            <label className="flex items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={draft.firstOrderOnly}
                onChange={(event) => setDraft({ ...draft, firstOrderOnly: event.target.checked })}
              />
              First order only
            </label>
            <label className="flex items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={draft.isActive}
                onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })}
              />
              Switched on
            </label>

            <label className="block">
              <span className="adm-label">Note to yourself</span>
              <input
                className="adm-input"
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                placeholder="Diwali campaign"
              />
            </label>

            <button type="submit" className="adm-btn adm-btn-primary w-full" disabled={pending}>
              {pending ? <Spinner size={14} /> : null} Save discount
            </button>
          </form>
        ) : (
          <div className="text-center">
            <p className="text-lg">Discount codes</p>
            <p className="mx-auto mt-2 max-w-xs text-sm" style={{ color: "var(--adm-muted)" }}>
              Percentage or fixed amounts, with limits on who can use them and when.
            </p>
            <button type="button" className="adm-btn adm-btn-primary mt-5" onClick={() => setDraft(BLANK)}>
              <Plus size={15} strokeWidth={1.8} /> New discount
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
