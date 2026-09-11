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
  const [results, setResults] = useState<Row[]>([]);
  const [chosen, setChosen] = useState<Row[]>([]);

  useEffect(() => {
    if (selected.length === 0) {
      setChosen([]);
      return;
    }
    fetch(`/api/admin/products/lookup?ids=${selected.join(",")}`)
      .then((response) => (response.ok ? response.json() : { products: [] }))
      .then((data) => {
        const byId = new Map<string, Row>((data.products as Row[]).map((row) => [row.id, row]));
        setChosen(selected.map((id) => byId.get(id)).filter(Boolean) as Row[]);
      })
      .catch(() => setChosen([]));
  }, [selected]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      fetch(`/api/admin/products/lookup?q=${encodeURIComponent(query)}`)
        .then((response) => (response.ok ? response.json() : { products: [] }))
        .then((data) => setResults(data.products))
        .catch(() => setResults([]));
    }, 280);
    return () => clearTimeout(timeout);
  }, [query]);

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
                    onChange([...selected, product.id]);
                    setQuery("");
                    setResults([]);
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
