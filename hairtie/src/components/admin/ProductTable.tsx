"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Copy, MoreHorizontal, Trash2 } from "lucide-react";
import {
  bulkProductAction, duplicateProduct, setProductStatus, updateStock,
} from "@/app/actions/admin/products";
import { useToast } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Spinner";
import { formatPaise } from "@/lib/money";

export type ProductRow = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  price: number;
  mrp: number;
  stock: number;
  lowStockThreshold: number;
  trackInventory: boolean;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  categoryName: string | null;
  imageUrl: string | null;
  variantCount: number;
  salesCount: number;
};

const STATUS_TONE = {
  ACTIVE: { bg: "#e4f0e6", color: "#356b40", label: "Live" },
  DRAFT: { bg: "#f3ece2", color: "#8a6b3c", label: "Draft" },
  ARCHIVED: { bg: "#eeeae5", color: "#6b6058", label: "Archived" },
};

export function ProductTable({ products }: { products: ProductRow[] }) {
  const { show } = useToast();
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const allSelected = products.length > 0 && selected.length === products.length;

  function run(action: () => Promise<{ ok: boolean; message?: string }>) {
    start(async () => {
      const result = await action();
      if (result.message) show(result.message, result.ok ? "default" : "error");
      if (result.ok) {
        setSelected([]);
        setOpenMenu(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="adm-card">
      {selected.length > 0 && (
        <div
          className="flex flex-wrap items-center gap-2 border-b px-4 py-3 text-sm"
          style={{ borderColor: "var(--adm-line)", background: "var(--adm-accent-soft)" }}
        >
          <span className="mr-2 font-medium">
            {selected.length} selected
          </span>
          <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" disabled={pending} onClick={() => run(() => bulkProductAction(selected, "publish"))}>
            Publish
          </button>
          <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" disabled={pending} onClick={() => run(() => bulkProductAction(selected, "draft"))}>
            Move to drafts
          </button>
          <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" disabled={pending} onClick={() => run(() => bulkProductAction(selected, "archive"))}>
            Archive
          </button>
          <button
            type="button"
            className="adm-btn adm-btn-danger adm-btn-sm"
            disabled={pending}
            onClick={() => {
              if (!window.confirm(`Delete ${selected.length} product(s)? Products that appear on past orders are archived instead.`)) return;
              run(() => bulkProductAction(selected, "delete"));
            }}
          >
            Delete
          </button>
          {pending && <Spinner size={14} />}
        </div>
      )}

      <div className="adm-scroll">
        <table className="adm-table">
          <thead>
            <tr>
              <th style={{ width: 34 }}>
                <label className="sr-only" htmlFor="select-all">Select all products</label>
                <input
                  id="select-all"
                  type="checkbox"
                  checked={allSelected}
                  onChange={(event) => setSelected(event.target.checked ? products.map((p) => p.id) : [])}
                  className="h-4 w-4"
                />
              </th>
              <th>Product</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th style={{ width: 44 }}></th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const tone = STATUS_TONE[product.status];
              const lowStock = product.trackInventory && product.stock <= product.lowStockThreshold;
              return (
                <tr key={product.id}>
                  <td>
                    <label className="sr-only" htmlFor={`select-${product.id}`}>Select {product.name}</label>
                    <input
                      id={`select-${product.id}`}
                      type="checkbox"
                      checked={selected.includes(product.id)}
                      onChange={(event) =>
                        setSelected((current) =>
                          event.target.checked
                            ? [...current, product.id]
                            : current.filter((id) => id !== product.id),
                        )
                      }
                      className="h-4 w-4"
                    />
                  </td>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="relative h-11 w-10 shrink-0 overflow-hidden rounded-md" style={{ background: "var(--adm-bg)" }}>
                        {product.imageUrl && <Image src={product.imageUrl} alt="" fill sizes="44px" className="object-cover" />}
                      </div>
                      <div className="min-w-0">
                        <Link href={`/admin/products/${product.id}`} className="block max-w-[18rem] truncate font-medium underline underline-offset-2">
                          {product.name}
                        </Link>
                        <p className="text-xs" style={{ color: "var(--adm-muted)" }}>
                          {product.sku}
                          {product.categoryName ? ` · ${product.categoryName}` : ""}
                          {product.variantCount > 0 ? ` · ${product.variantCount} colours` : ""}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div>{formatPaise(product.price)}</div>
                    {product.mrp > product.price && (
                      <div className="text-xs line-through" style={{ color: "var(--adm-muted)" }}>
                        {formatPaise(product.mrp)}
                      </div>
                    )}
                  </td>
                  <td>
                    <StockCell product={product} lowStock={lowStock} />
                  </td>
                  <td>
                    <span className="adm-pill" style={{ background: tone.bg, color: tone.color }}>{tone.label}</span>
                  </td>
                  <td className="relative">
                    <button
                      type="button"
                      aria-label={`Actions for ${product.name}`}
                      className="rounded-md p-1.5 hover:bg-[var(--adm-bg)]"
                      onClick={() => setOpenMenu(openMenu === product.id ? null : product.id)}
                    >
                      <MoreHorizontal size={17} strokeWidth={1.7} />
                    </button>
                    {openMenu === product.id && (
                      <>
                        <button type="button" aria-label="Close menu" className="fixed inset-0 z-10 cursor-default" onClick={() => setOpenMenu(null)} />
                        <div
                          className="absolute right-2 top-full z-20 w-52 overflow-hidden rounded-lg py-1 text-sm shadow-lg"
                          style={{ background: "var(--adm-surface)", border: "1px solid var(--adm-line)" }}
                        >
                          <Link href={`/admin/products/${product.id}`} className="block px-3 py-2 hover:bg-[var(--adm-bg)]">Edit</Link>
                          <Link href={`/products/${product.slug}`} target="_blank" className="block px-3 py-2 hover:bg-[var(--adm-bg)]">View on shop</Link>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[var(--adm-bg)]"
                            onClick={() => run(() => duplicateProduct(product.id))}
                          >
                            <Copy size={14} strokeWidth={1.6} /> Duplicate
                          </button>
                          {product.status !== "ACTIVE" && (
                            <button type="button" className="block w-full px-3 py-2 text-left hover:bg-[var(--adm-bg)]" onClick={() => run(() => setProductStatus(product.id, "ACTIVE"))}>
                              Publish
                            </button>
                          )}
                          {product.status === "ACTIVE" && (
                            <button type="button" className="block w-full px-3 py-2 text-left hover:bg-[var(--adm-bg)]" onClick={() => run(() => setProductStatus(product.id, "DRAFT"))}>
                              Move to drafts
                            </button>
                          )}
                          {product.status !== "ARCHIVED" && (
                            <button type="button" className="block w-full px-3 py-2 text-left hover:bg-[var(--adm-bg)]" onClick={() => run(() => setProductStatus(product.id, "ARCHIVED"))}>
                              Archive
                            </button>
                          )}
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[var(--adm-bg)]"
                            style={{ color: "#9c3a3a" }}
                            onClick={() => {
                              if (!window.confirm(`Delete "${product.name}"? If it appears on a past order it will be archived instead.`)) return;
                              run(async () => {
                                const { deleteProduct } = await import("@/app/actions/admin/products");
                                return deleteProduct(product.id);
                              });
                            }}
                          >
                            <Trash2 size={14} strokeWidth={1.6} /> Delete
                          </button>
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Stock can be corrected straight from the list — the most common daily edit. */
function StockCell({ product, lowStock }: { product: ProductRow; lowStock: boolean }) {
  const { show } = useToast();
  const router = useRouter();
  const [value, setValue] = useState(String(product.stock));
  const [saving, setSaving] = useState(false);

  if (!product.trackInventory) {
    return <span style={{ color: "var(--adm-muted)" }}>Not tracked</span>;
  }

  if (product.variantCount > 0) {
    return (
      <span style={{ color: lowStock ? "#b4762f" : undefined }}>
        {product.stock} <span className="text-xs" style={{ color: "var(--adm-muted)" }}>+ colours</span>
      </span>
    );
  }

  async function save() {
    const next = Number(value);
    if (next === product.stock) return;
    setSaving(true);
    const result = await updateStock(product.id, next);
    show(result.message ?? "", result.ok ? "default" : "error");
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <label className="sr-only" htmlFor={`stock-${product.id}`}>Stock for {product.name}</label>
      <input
        id={`stock-${product.id}`}
        value={value}
        onChange={(event) => setValue(event.target.value.replace(/\D/g, ""))}
        onBlur={save}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        inputMode="numeric"
        className="adm-input w-16 px-2 py-1 text-sm"
        style={{ color: lowStock ? "#b4762f" : undefined }}
      />
      {saving && <Spinner size={12} />}
    </div>
  );
}
