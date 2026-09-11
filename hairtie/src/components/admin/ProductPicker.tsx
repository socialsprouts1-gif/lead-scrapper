"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { formatPaise } from "@/lib/money";

type Row = { id: string; name: string; price: number; imageUrl: string | null };

/** Search-and-pick list used by page-builder blocks that show chosen products. */
export function ProductPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [fetched, setFetched] = useState<Row[]>([]);
  const [known, setKnown] = useState<Record<string, Row>>({});

  // Look up the names of already-chosen products.
  useEffect(() => {
    if (selected.length === 0) return;
    const missing = selected.filter((id) => !known[id]);
    if (missing.length === 0) return;
    let cancelled = false;
    fetch(`/api/admin/products/lookup?ids=${missing.join(",")}`)
      .then((response) => (response.ok ? response.json() : { products: [] }))
      .then((data) => {
        if (cancelled) return;
        setKnown((current) => {
          const next = { ...current };
          for (const row of data.products as Row[]) next[row.id] = row;
          return next;
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selected, known]);

  // Search, debounced.
  useEffect(() => {
    const term = query.trim();
    if (!term) return;
    let cancelled = false;
    const timeout = setTimeout(() => {
      fetch(`/api/admin/products/lookup?q=${encodeURIComponent(term)}`)
        .then((response) => (response.ok ? response.json() : { products: [] }))
        .then((data) => {
          if (!cancelled) setFetched(data.products);
        })
        .catch(() => {});
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query]);

  // Derived, so an empty selection or an empty query needs no state update.
  const chosen = selected.map((id) => known[id]).filter(Boolean) as Row[];
  const results = query.trim() ? fetched : [];

  return (
    <div>
      {chosen.length > 0 && (
        <ul className="mb-2 space-y-1.5">
          {chosen.map((product) => (
            <li key={product.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5" style={{ background: "var(--adm-bg)" }}>
              <div className="relative h-8 w-7 shrink-0 overflow-hidden rounded" style={{ background: "var(--adm-surface)" }}>
                {product.imageUrl && <Image src={product.imageUrl} alt="" fill sizes="32px" className="object-cover" />}
              </div>
              <span className="min-w-0 flex-1 truncate text-sm">{product.name}</span>
              <button
                type="button"
                onClick={() => onChange(selected.filter((id) => id !== product.id))}
                aria-label={`Remove ${product.name}`}
                className="rounded p-1"
              >
                <X size={13} strokeWidth={2} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
        <Search size={14} strokeWidth={1.7} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--adm-muted)" }} />
        <label className="sr-only" htmlFor="product-picker-search">Search products</label>
        <input
          id="product-picker-search"
          className="adm-input pl-9"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search products to add"
        />
      </div>

      {results.length > 0 && (
        <ul className="mt-2 max-h-52 space-y-1 overflow-y-auto rounded-lg p-1" style={{ background: "var(--adm-bg)" }}>
          {results
            .filter((product) => !selected.includes(product.id))
            .map((product) => (
              <li key={product.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-[var(--adm-surface)]"
                  onClick={() => {
                    setKnown((current) => ({ ...current, [product.id]: product }));
                    onChange([...selected, product.id]);
                    setQuery("");
                  }}
                >
                  <div className="relative h-8 w-7 shrink-0 overflow-hidden rounded" style={{ background: "var(--adm-surface)" }}>
                    {product.imageUrl && <Image src={product.imageUrl} alt="" fill sizes="32px" className="object-cover" />}
                  </div>
                  <span className="min-w-0 flex-1 truncate text-sm">{product.name}</span>
                  <span className="text-xs" style={{ color: "var(--adm-muted)" }}>{formatPaise(product.price)}</span>
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
