"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SlidersHorizontal, X, Check } from "lucide-react";
import { formatPaise } from "@/lib/money";
import { SORT_OPTIONS } from "@/lib/shop-options";

type Facets = {
  colors: { color: string; colorHex: string | null }[];
  tags: { name: string; slug: string }[];
  minPrice: number;
  maxPrice: number;
  categories: { id: string; name: string; slug: string; parentId: string | null; _count: { products: number } }[];
};

export function ShopFilters({
  facets,
  total,
  lockedCategory,
}: {
  facets: Facets;
  total: number;
  lockedCategory?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function update(changes: Record<string, string | string[] | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      next.delete(key);
      if (Array.isArray(value)) value.forEach((v) => next.append(key, v));
      else if (value) next.set(key, value);
    }
    next.delete("page");
    router.push(`?${next.toString()}`, { scroll: false });
  }

  function toggleMulti(key: string, value: string) {
    const current = params.getAll(key);
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    update({ [key]: next });
  }

  const activeColors = params.getAll("color");
  const activeTags = params.getAll("tag");
  const activeCategory = params.get("category");
  const inStockOnly = params.get("availability") === "in-stock";
  const maxPrice = params.get("maxPrice");

  const activeCount =
    activeColors.length +
    activeTags.length +
    (activeCategory && !lockedCategory ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    (maxPrice ? 1 : 0);

  const parents = facets.categories.filter((c) => !c.parentId);
  const priceSteps = [500, 1000, 1500, 2500].map((r) => r * 100).filter((p) => p <= facets.maxPrice);

  const panel = (
    <div className="space-y-8">
      {!lockedCategory && parents.length > 0 && (
        <FilterGroup title="Category">
          <div className="space-y-1.5">
            {parents.map((parent) => (
              <div key={parent.id}>
                <FilterRow
                  label={parent.name}
                  count={parent._count.products}
                  checked={activeCategory === parent.slug}
                  onChange={() => update({ category: activeCategory === parent.slug ? null : parent.slug })}
                />
                <div className="ml-4">
                  {facets.categories
                    .filter((c) => c.parentId === parent.id)
                    .map((child) => (
                      <FilterRow
                        key={child.id}
                        label={child.name}
                        count={child._count.products}
                        checked={activeCategory === child.slug}
                        onChange={() => update({ category: activeCategory === child.slug ? null : child.slug })}
                      />
                    ))}
                </div>
              </div>
            ))}
          </div>
        </FilterGroup>
      )}

      <FilterGroup title="Price">
        <div className="space-y-1.5">
          {priceSteps.map((step) => (
            <FilterRow
              key={step}
              label={`Under ${formatPaise(step)}`}
              checked={maxPrice === String(step)}
              onChange={() => update({ maxPrice: maxPrice === String(step) ? null : String(step) })}
            />
          ))}
          <FilterRow
            label={`${formatPaise(facets.maxPrice)} and under`}
            checked={maxPrice === String(facets.maxPrice)}
            onChange={() =>
              update({ maxPrice: maxPrice === String(facets.maxPrice) ? null : String(facets.maxPrice) })
            }
          />
        </div>
      </FilterGroup>

      {facets.colors.length > 0 && (
        <FilterGroup title="Colour">
          <div className="flex flex-wrap gap-2">
            {facets.colors.map((color) => {
              const active = activeColors.includes(color.color);
              return (
                <button
                  key={color.color}
                  type="button"
                  onClick={() => toggleMulti("color", color.color)}
                  aria-pressed={active}
                  className="flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 text-xs transition"
                  style={{
                    border: `1px solid ${active ? "var(--ht-text)" : "var(--ht-border)"}`,
                    background: active ? "var(--ht-secondary)" : "transparent",
                  }}
                >
                  <span
                    className="h-4 w-4 rounded-full"
                    style={{ background: color.colorHex ?? "var(--ht-border)", boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.08)" }}
                  />
                  {color.color}
                </button>
              );
            })}
          </div>
        </FilterGroup>
      )}

      {facets.tags.length > 0 && (
        <FilterGroup title="Tags">
          <div className="flex flex-wrap gap-2">
            {facets.tags.map((tag) => {
              const active = activeTags.includes(tag.slug);
              return (
                <button
                  key={tag.slug}
                  type="button"
                  onClick={() => toggleMulti("tag", tag.slug)}
                  aria-pressed={active}
                  className="rounded-full px-3 py-1.5 text-xs transition"
                  style={{
                    border: `1px solid ${active ? "var(--ht-text)" : "var(--ht-border)"}`,
                    background: active ? "var(--ht-text)" : "transparent",
                    color: active ? "var(--ht-bg)" : "var(--ht-text)",
                  }}
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
        </FilterGroup>
      )}

      <FilterGroup title="Availability">
        <FilterRow
          label="In stock only"
          checked={inStockOnly}
          onChange={() => update({ availability: inStockOnly ? null : "in-stock" })}
        />
      </FilterGroup>

      {activeCount > 0 && (
        <button
          type="button"
          onClick={() => update({ color: [], tag: [], maxPrice: null, availability: null, ...(lockedCategory ? {} : { category: null }) })}
          className="ht-btn ht-btn-outline ht-btn-sm w-full"
        >
          Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-3 border-b pb-4" style={{ borderColor: "var(--ht-border)" }}>
        <p className="text-sm" style={{ color: "var(--ht-muted)" }}>
          {total} {total === 1 ? "piece" : "pieces"}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="ht-btn ht-btn-outline ht-btn-sm lg:hidden"
          >
            <SlidersHorizontal size={14} strokeWidth={1.6} />
            Filters{activeCount > 0 ? ` (${activeCount})` : ""}
          </button>
          <label className="sr-only" htmlFor="sort">
            Sort by
          </label>
          <select
            id="sort"
            value={params.get("sort") ?? "newest"}
            onChange={(e) => update({ sort: e.target.value })}
            className="ht-input w-auto py-2 text-sm"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <aside className="hidden lg:block">{panel}</aside>

      {open && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <button
            type="button"
            aria-label="Close filters"
            className="absolute inset-0"
            style={{ background: "rgba(47,41,37,0.45)" }}
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute inset-x-0 bottom-0 max-h-[86vh] overflow-y-auto rounded-t-3xl p-6"
            style={{ background: "var(--ht-bg)" }}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl">Filters</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close filters" className="p-1">
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>
            {panel}
            <button type="button" onClick={() => setOpen(false)} className="ht-btn ht-btn-primary mt-8 w-full">
              Show {total} results
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="ht-eyebrow mb-3">{title}</p>
      {children}
    </div>
  );
}

function FilterRow({
  label,
  count,
  checked,
  onChange,
}: {
  label: string;
  count?: number;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-1 text-sm">
      <span
        className="grid h-4 w-4 shrink-0 place-items-center rounded-[4px] transition"
        style={{
          border: `1px solid ${checked ? "var(--ht-text)" : "var(--ht-border)"}`,
          background: checked ? "var(--ht-text)" : "transparent",
          color: "var(--ht-bg)",
        }}
      >
        {checked && <Check size={11} strokeWidth={3} />}
      </span>
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <span className="flex-1">{label}</span>
      {count !== undefined && (
        <span className="text-xs" style={{ color: "var(--ht-muted)" }}>
          {count}
        </span>
      )}
    </label>
  );
}
