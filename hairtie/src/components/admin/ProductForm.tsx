"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2, X } from "lucide-react";
import { createProduct, updateProduct } from "@/app/actions/admin/products";
import { MediaDialog } from "@/components/admin/MediaPicker";
import { useToast } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Spinner";
import { slugify } from "@/lib/utils";
import { discountPercent } from "@/lib/money";

export type ProductFormValues = {
  id?: string;
  name: string;
  slug: string;
  sku: string;
  brand: string;
  categoryId: string;
  shortDescription: string;
  description: string;
  mrp: string;
  price: string;
  costPrice: string;
  stock: string;
  lowStockThreshold: string;
  trackInventory: boolean;
  allowBackorder: boolean;
  hsnCode: string;
  gstRate: string;
  priceIncludesTax: boolean;
  weightGrams: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  material: string;
  careInstructions: string;
  countryOfOrigin: string;
  videoUrl: string;
  isNewArrival: boolean;
  isBestseller: boolean;
  isTrending: boolean;
  isFeatured: boolean;
  isOnSale: boolean;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  ogImageUrl: string;
  canonicalUrl: string;
  images: { url: string; alt: string }[];
  variants: {
    id?: string;
    name: string;
    sku: string;
    color: string;
    colorHex: string;
    size: string;
    price: string;
    mrp: string;
    stock: string;
    imageUrl: string;
    isActive: boolean;
  }[];
  attributes: { name: string; value: string; group: string }[];
  tags: string[];
};

export const EMPTY_PRODUCT: ProductFormValues = {
  name: "", slug: "", sku: "", brand: "Hairtie", categoryId: "",
  shortDescription: "", description: "",
  mrp: "", price: "", costPrice: "",
  stock: "0", lowStockThreshold: "5", trackInventory: true, allowBackorder: false,
  hsnCode: "", gstRate: "5", priceIncludesTax: true,
  weightGrams: "", lengthCm: "", widthCm: "", heightCm: "",
  material: "", careInstructions: "", countryOfOrigin: "India", videoUrl: "",
  isNewArrival: true, isBestseller: false, isTrending: false, isFeatured: false, isOnSale: false,
  status: "DRAFT",
  seoTitle: "", seoDescription: "", seoKeywords: "", ogImageUrl: "", canonicalUrl: "",
  images: [], variants: [], attributes: [], tags: [],
};

type Category = { id: string; name: string; parentId: string | null };

const TABS = [
  { id: "basics", label: "The basics" },
  { id: "images", label: "Photos" },
  { id: "pricing", label: "Price & stock" },
  { id: "variants", label: "Colours & sizes" },
  { id: "details", label: "Details" },
  { id: "seo", label: "SEO" },
] as const;

export function ProductForm({
  initial,
  categories,
}: {
  initial: ProductFormValues;
  categories: Category[];
}) {
  const router = useRouter();
  const { show } = useToast();
  const [values, setValues] = useState<ProductFormValues>(initial);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("basics");
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [variantPicker, setVariantPicker] = useState<number | null>(null);
  const isNew = !initial.id;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function set<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  const off = useMemo(() => {
    const mrp = Number(values.mrp) || 0;
    const price = Number(values.price) || 0;
    return discountPercent(mrp * 100, price * 100);
  }, [values.mrp, values.price]);

  async function save(publish?: boolean) {
    setSaving(true);
    const payload = {
      ...values,
      status: publish ? ("ACTIVE" as const) : values.status,
      slug: values.slug || slugify(values.name),
      costPrice: values.costPrice || undefined,
      variants: values.variants.map((variant) => ({
        ...variant,
        price: variant.price || undefined,
        mrp: variant.mrp || undefined,
      })),
    };

    const result = initial.id
      ? await updateProduct(initial.id, payload)
      : await createProduct(payload);

    show(result.message ?? (result.ok ? "Saved." : "Could not save."), result.ok ? "default" : "error");
    setSaving(false);

    if (result.ok) {
      if (publish) set("status", "ACTIVE");
      if (!initial.id && result.data && typeof result.data === "object" && "id" in result.data) {
        router.push(`/admin/products/${(result.data as { id: string }).id}`);
      } else {
        router.refresh();
      }
    }
  }

  function onImageDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = values.images.findIndex((image) => image.url === active.id);
    const newIndex = values.images.findIndex((image) => image.url === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    set("images", arrayMove(values.images, oldIndex, newIndex));
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="adm-scroll flex gap-1" role="tablist">
          {TABS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={tab === entry.id}
              onClick={() => setTab(entry.id)}
              className="whitespace-nowrap rounded-lg px-3 py-2 text-sm transition"
              style={{
                background: tab === entry.id ? "var(--adm-accent-soft)" : "transparent",
                color: tab === entry.id ? "var(--adm-accent)" : "var(--adm-muted)",
                fontWeight: tab === entry.id ? 500 : 400,
              }}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="product-status">Status</label>
          <select
            id="product-status"
            value={values.status}
            onChange={(event) => set("status", event.target.value as ProductFormValues["status"])}
            className="adm-input w-auto"
          >
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Live on shop</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <button type="submit" className="adm-btn adm-btn-ghost" disabled={saving}>
            {saving ? <Spinner size={14} /> : null} Save
          </button>
          {values.status !== "ACTIVE" && (
            <button type="button" className="adm-btn adm-btn-primary" disabled={saving} onClick={() => save(true)}>
              Save &amp; publish
            </button>
          )}
        </div>
      </div>

      {tab === "basics" && (
        <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
          <div className="adm-card space-y-4 p-6">
            <Field label="Product name" required>
              <input
                className="adm-input"
                value={values.name}
                onChange={(event) => {
                  const name = event.target.value;
                  setValues((current) => ({
                    ...current,
                    name,
                    slug: isNew && !current.slug ? "" : current.slug,
                  }));
                }}
                placeholder="Marble Swirl Claw Clip"
                required
              />
            </Field>

            <Field label="Short description" hint="One line shown on product cards and in search results.">
              <input
                className="adm-input"
                value={values.shortDescription}
                onChange={(event) => set("shortDescription", event.target.value)}
                maxLength={300}
                placeholder="A large jaw clip in a soft marbled finish."
              />
            </Field>

            <Field label="Full description" hint="Leave a blank line between paragraphs.">
              <textarea
                rows={9}
                className="adm-input"
                value={values.description}
                onChange={(event) => set("description", event.target.value)}
              />
            </Field>
          </div>

          <div className="space-y-5">
            <div className="adm-card space-y-4 p-6">
              <Field label="Category">
                <select
                  className="adm-input"
                  value={values.categoryId}
                  onChange={(event) => set("categoryId", event.target.value)}
                >
                  <option value="">No category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.parentId ? `— ${category.name}` : category.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="SKU" required hint="Your own code for this product. Used on invoices and marketplace listings.">
                <input
                  className="adm-input uppercase"
                  value={values.sku}
                  onChange={(event) => set("sku", event.target.value.toUpperCase())}
                  placeholder="HT-CLA-001"
                  required
                />
              </Field>

              <Field label="Web address" hint="Leave blank and we'll create one from the name.">
                <div className="flex items-center gap-1 text-sm">
                  <span style={{ color: "var(--adm-muted)" }}>/products/</span>
                  <input
                    className="adm-input"
                    value={values.slug}
                    onChange={(event) => set("slug", slugify(event.target.value))}
                    placeholder={slugify(values.name) || "product-name"}
                  />
                </div>
              </Field>
            </div>

            <div className="adm-card p-6">
              <p className="adm-label mb-3">Show this product in…</p>
              <div className="space-y-2.5">
                <Toggle label="New Arrivals" checked={values.isNewArrival} onChange={(v) => set("isNewArrival", v)} />
                <Toggle label="Best Sellers" checked={values.isBestseller} onChange={(v) => set("isBestseller", v)} />
                <Toggle label="Trending" checked={values.isTrending} onChange={(v) => set("isTrending", v)} />
                <Toggle label="Featured" checked={values.isFeatured} onChange={(v) => set("isFeatured", v)} />
                <Toggle label="On Sale (shows a Sale badge)" checked={values.isOnSale} onChange={(v) => set("isOnSale", v)} />
              </div>
            </div>

            <div className="adm-card p-6">
              <Field label="Tags" hint="Press Enter after each tag. Customers can filter by these.">
                <TagInput tags={values.tags} onChange={(tags) => set("tags", tags)} />
              </Field>
            </div>
          </div>
        </div>
      )}

      {tab === "images" && (
        <div className="adm-card p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg">Product photos</h2>
              <p className="mt-1 text-sm" style={{ color: "var(--adm-muted)" }}>
                The first photo is the one shown on product cards. Drag to reorder.
              </p>
            </div>
            <button type="button" className="adm-btn adm-btn-primary" onClick={() => setPickerOpen(true)}>
              <Plus size={15} strokeWidth={1.8} /> Add photos
            </button>
          </div>

          {values.images.length === 0 ? (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="grid w-full place-items-center rounded-xl border-2 border-dashed py-16"
              style={{ borderColor: "var(--adm-line)" }}
            >
              <p className="text-sm font-medium">Add your first photo</p>
              <p className="mt-1 text-xs" style={{ color: "var(--adm-muted)" }}>
                Upload from your phone or computer, or pick one you&apos;ve used before.
              </p>
            </button>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onImageDragEnd}>
              <SortableContext items={values.images.map((image) => image.url)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {values.images.map((image, index) => (
                    <SortableImage
                      key={image.url}
                      image={image}
                      index={index}
                      onAlt={(alt) => {
                        const next = [...values.images];
                        next[index] = { ...next[index], alt };
                        set("images", next);
                      }}
                      onRemove={() => set("images", values.images.filter((_, i) => i !== index))}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {pickerOpen && (
            <MediaDialog
              title="Add product photos"
              multiple
              selectedUrls={values.images.map((image) => image.url)}
              onClose={() => setPickerOpen(false)}
              onSelect={(assets) => {
                const additions = assets
                  .filter((asset) => !values.images.some((image) => image.url === asset.url))
                  .map((asset) => ({ url: asset.url, alt: asset.alt || values.name }));
                if (additions.length) set("images", [...values.images, ...additions]);
                else set("images", values.images.filter((image) => image.url !== assets[0]?.url));
              }}
            />
          )}
        </div>
      )}

      {tab === "pricing" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="adm-card space-y-4 p-6">
            <h2 className="text-lg">Price</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="MRP (₹)" hint="The crossed-out price.">
                <input className="adm-input" inputMode="decimal" value={values.mrp} onChange={(e) => set("mrp", e.target.value)} placeholder="599" />
              </Field>
              <Field label="Selling price (₹)" required hint="What the customer pays.">
                <input className="adm-input" inputMode="decimal" value={values.price} onChange={(e) => set("price", e.target.value)} placeholder="399" required />
              </Field>
            </div>
            {off > 0 && (
              <p className="rounded-lg px-3 py-2 text-sm" style={{ background: "var(--adm-accent-soft)", color: "var(--adm-accent)" }}>
                Customers will see {off}% off.
              </p>
            )}
            <Field label="Cost price (₹)" hint="Only you see this. Used for your own margin working.">
              <input className="adm-input" inputMode="decimal" value={values.costPrice} onChange={(e) => set("costPrice", e.target.value)} />
            </Field>

            <div className="border-t pt-4" style={{ borderColor: "var(--adm-line)" }}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="GST rate (%)" hint="5% for hair accessories, 18% for bags — check with your accountant.">
                  <input className="adm-input" inputMode="numeric" value={values.gstRate} onChange={(e) => set("gstRate", e.target.value)} />
                </Field>
                <Field label="HSN code" hint="Needed for GST invoices and marketplace listings.">
                  <input className="adm-input" value={values.hsnCode} onChange={(e) => set("hsnCode", e.target.value)} placeholder="9615" />
                </Field>
              </div>
              <div className="mt-3">
                <Toggle label="Selling price already includes GST" checked={values.priceIncludesTax} onChange={(v) => set("priceIncludesTax", v)} />
              </div>
            </div>
          </div>

          <div className="adm-card space-y-4 p-6">
            <h2 className="text-lg">Stock</h2>
            <Toggle label="Keep track of stock for this product" checked={values.trackInventory} onChange={(v) => set("trackInventory", v)} />
            {values.trackInventory && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Quantity in stock" hint={values.variants.length > 0 ? "With colours set up, each colour has its own stock." : undefined}>
                    <input className="adm-input" inputMode="numeric" value={values.stock} onChange={(e) => set("stock", e.target.value.replace(/\D/g, ""))} />
                  </Field>
                  <Field label="Warn me below" hint="You'll see it on your dashboard.">
                    <input className="adm-input" inputMode="numeric" value={values.lowStockThreshold} onChange={(e) => set("lowStockThreshold", e.target.value.replace(/\D/g, ""))} />
                  </Field>
                </div>
                <Toggle label="Allow orders when out of stock" checked={values.allowBackorder} onChange={(v) => set("allowBackorder", v)} />
              </>
            )}
          </div>
        </div>
      )}

      {tab === "variants" && (
        <div className="adm-card p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg">Colours &amp; sizes</h2>
              <p className="mt-1 max-w-xl text-sm" style={{ color: "var(--adm-muted)" }}>
                Add one row per colour or size. Each has its own stock. Leave this empty if the product comes
                only one way.
              </p>
            </div>
            <button
              type="button"
              className="adm-btn adm-btn-ghost"
              onClick={() =>
                set("variants", [
                  ...values.variants,
                  { name: "", sku: "", color: "", colorHex: "#e9c2c0", size: "", price: "", mrp: "", stock: "0", imageUrl: "", isActive: true },
                ])
              }
            >
              <Plus size={15} strokeWidth={1.8} /> Add option
            </button>
          </div>

          {values.variants.length === 0 ? (
            <p className="rounded-xl border-2 border-dashed px-6 py-10 text-center text-sm" style={{ borderColor: "var(--adm-line)", color: "var(--adm-muted)" }}>
              No colour or size options yet.
            </p>
          ) : (
            <div className="space-y-3">
              {values.variants.map((variant, index) => (
                <div key={index} className="grid gap-3 rounded-xl p-4 sm:grid-cols-[auto_1fr_1fr_6rem_6rem_auto]" style={{ background: "var(--adm-bg)" }}>
                  <button
                    type="button"
                    onClick={() => setVariantPicker(index)}
                    className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg"
                    style={{ background: "var(--adm-surface)", border: "1px solid var(--adm-line)" }}
                    aria-label={`Photo for option ${index + 1}`}
                  >
                    {variant.imageUrl ? (
                      <Image src={variant.imageUrl} alt="" fill sizes="48px" className="object-cover" />
                    ) : (
                      <span className="grid h-full place-items-center text-[0.6rem]" style={{ color: "var(--adm-muted)" }}>Photo</span>
                    )}
                  </button>

                  <div>
                    <label className="sr-only" htmlFor={`variant-name-${index}`}>Option name</label>
                    <input
                      id={`variant-name-${index}`}
                      className="adm-input"
                      placeholder="Ivory"
                      value={variant.name}
                      onChange={(event) => {
                        const next = [...values.variants];
                        next[index] = { ...next[index], name: event.target.value, color: event.target.value };
                        set("variants", next);
                      }}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="sr-only" htmlFor={`variant-color-${index}`}>Colour swatch</label>
                    <input
                      id={`variant-color-${index}`}
                      type="color"
                      className="h-9 w-12 shrink-0 cursor-pointer rounded border"
                      style={{ borderColor: "var(--adm-line)" }}
                      value={variant.colorHex || "#e9c2c0"}
                      onChange={(event) => {
                        const next = [...values.variants];
                        next[index] = { ...next[index], colorHex: event.target.value };
                        set("variants", next);
                      }}
                    />
                    <input
                      className="adm-input"
                      placeholder="Size (optional)"
                      value={variant.size}
                      onChange={(event) => {
                        const next = [...values.variants];
                        next[index] = { ...next[index], size: event.target.value };
                        set("variants", next);
                      }}
                      aria-label={`Size for option ${index + 1}`}
                    />
                  </div>

                  <div>
                    <label className="sr-only" htmlFor={`variant-price-${index}`}>Price override</label>
                    <input
                      id={`variant-price-${index}`}
                      className="adm-input"
                      inputMode="decimal"
                      placeholder="Price"
                      value={variant.price}
                      onChange={(event) => {
                        const next = [...values.variants];
                        next[index] = { ...next[index], price: event.target.value };
                        set("variants", next);
                      }}
                    />
                  </div>

                  <div>
                    <label className="sr-only" htmlFor={`variant-stock-${index}`}>Stock</label>
                    <input
                      id={`variant-stock-${index}`}
                      className="adm-input"
                      inputMode="numeric"
                      placeholder="Stock"
                      value={variant.stock}
                      onChange={(event) => {
                        const next = [...values.variants];
                        next[index] = { ...next[index], stock: event.target.value.replace(/\D/g, "") };
                        set("variants", next);
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => set("variants", values.variants.filter((_, i) => i !== index))}
                    className="self-center rounded-md p-2"
                    aria-label={`Remove option ${index + 1}`}
                    style={{ color: "#9c3a3a" }}
                  >
                    <Trash2 size={16} strokeWidth={1.6} />
                  </button>
                </div>
              ))}
              <p className="text-xs" style={{ color: "var(--adm-muted)" }}>
                Leave the price blank to use the product&apos;s main price.
              </p>
            </div>
          )}

          {variantPicker !== null && (
            <MediaDialog
              title="Choose a photo for this option"
              onClose={() => setVariantPicker(null)}
              onSelect={(assets) => {
                const next = [...values.variants];
                next[variantPicker] = { ...next[variantPicker], imageUrl: assets[0].url };
                set("variants", next);
                setVariantPicker(null);
              }}
            />
          )}
        </div>
      )}

      {tab === "details" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="adm-card space-y-4 p-6">
            <h2 className="text-lg">Specifications</h2>
            <p className="text-sm" style={{ color: "var(--adm-muted)" }}>
              These appear in the &ldquo;Details &amp; specifications&rdquo; box on the product page. Add anything
              you like — strap type, closure, compartments.
            </p>
            <div className="space-y-2">
              {values.attributes.map((attribute, index) => (
                <div key={index} className="flex gap-2">
                  <label className="sr-only" htmlFor={`attr-name-${index}`}>Specification name</label>
                  <input
                    id={`attr-name-${index}`}
                    className="adm-input"
                    style={{ maxWidth: "11rem" }}
                    placeholder="Strap type"
                    value={attribute.name}
                    onChange={(event) => {
                      const next = [...values.attributes];
                      next[index] = { ...next[index], name: event.target.value };
                      set("attributes", next);
                    }}
                  />
                  <label className="sr-only" htmlFor={`attr-value-${index}`}>Specification value</label>
                  <input
                    id={`attr-value-${index}`}
                    className="adm-input"
                    placeholder="Adjustable, detachable"
                    value={attribute.value}
                    onChange={(event) => {
                      const next = [...values.attributes];
                      next[index] = { ...next[index], value: event.target.value };
                      set("attributes", next);
                    }}
                  />
                  <button
                    type="button"
                    className="shrink-0 rounded-md p-2"
                    aria-label={`Remove specification ${index + 1}`}
                    style={{ color: "#9c3a3a" }}
                    onClick={() => set("attributes", values.attributes.filter((_, i) => i !== index))}
                  >
                    <Trash2 size={15} strokeWidth={1.6} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="adm-btn adm-btn-ghost adm-btn-sm"
              onClick={() => set("attributes", [...values.attributes, { name: "", value: "", group: "Specifications" }])}
            >
              <Plus size={14} strokeWidth={1.8} /> Add a specification
            </button>
          </div>

          <div className="adm-card space-y-4 p-6">
            <h2 className="text-lg">Size, weight &amp; care</h2>
            <Field label="Material">
              <input className="adm-input" value={values.material} onChange={(e) => set("material", e.target.value)} placeholder="Quilted vegan leather" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Weight (grams)" hint="Used for shipping and marketplace listings.">
                <input className="adm-input" inputMode="numeric" value={values.weightGrams} onChange={(e) => set("weightGrams", e.target.value)} />
              </Field>
              <Field label="Country of origin">
                <input className="adm-input" value={values.countryOfOrigin} onChange={(e) => set("countryOfOrigin", e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Length (cm)">
                <input className="adm-input" inputMode="decimal" value={values.lengthCm} onChange={(e) => set("lengthCm", e.target.value)} />
              </Field>
              <Field label="Width (cm)">
                <input className="adm-input" inputMode="decimal" value={values.widthCm} onChange={(e) => set("widthCm", e.target.value)} />
              </Field>
              <Field label="Height (cm)">
                <input className="adm-input" inputMode="decimal" value={values.heightCm} onChange={(e) => set("heightCm", e.target.value)} />
              </Field>
            </div>
            <Field label="Care instructions">
              <textarea rows={3} className="adm-input" value={values.careInstructions} onChange={(e) => set("careInstructions", e.target.value)} />
            </Field>
            <Field label="Product video link" hint="A YouTube link, or a direct .mp4 link.">
              <input className="adm-input" value={values.videoUrl} onChange={(e) => set("videoUrl", e.target.value)} />
            </Field>
          </div>
        </div>
      )}

      {tab === "seo" && (
        <div className="adm-card max-w-2xl space-y-4 p-6">
          <h2 className="text-lg">How this shows up on Google</h2>
          <p className="text-sm" style={{ color: "var(--adm-muted)" }}>
            Leave these blank and we&apos;ll use the product name and short description, which is usually right.
          </p>

          <div className="rounded-xl p-4" style={{ background: "var(--adm-bg)" }}>
            <p className="text-xs" style={{ color: "#3a7d3a" }}>
              yourshop.in › products › {values.slug || slugify(values.name) || "product-name"}
            </p>
            <p className="mt-1 text-base" style={{ color: "#1a0dab" }}>
              {values.seoTitle || `${values.name || "Product name"} — Buy Online | Hairtie`}
            </p>
            <p className="mt-0.5 text-sm" style={{ color: "var(--adm-muted)" }}>
              {values.seoDescription || values.shortDescription || "Add a short description to control this text."}
            </p>
          </div>

          <Field label="Page title" hint={`${values.seoTitle.length}/60 characters is ideal.`}>
            <input className="adm-input" value={values.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} maxLength={160} />
          </Field>
          <Field label="Description" hint={`${values.seoDescription.length}/160 characters is ideal.`}>
            <textarea rows={3} className="adm-input" value={values.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} maxLength={320} />
          </Field>
          <Field label="Keywords" hint="Comma separated. Optional.">
            <input className="adm-input" value={values.seoKeywords} onChange={(e) => set("seoKeywords", e.target.value)} />
          </Field>
          <Field label="Canonical URL" hint="Only needed if this product also lives at another address.">
            <input className="adm-input" value={values.canonicalUrl} onChange={(e) => set("canonicalUrl", e.target.value)} />
          </Field>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/products" className="adm-btn adm-btn-ghost">Back to products</Link>
        <div className="flex gap-2">
          {initial.id && values.status === "ACTIVE" && (
            <Link href={`/products/${initial.slug}`} target="_blank" className="adm-btn adm-btn-ghost">
              View on shop
            </Link>
          )}
          <button type="submit" className="adm-btn adm-btn-primary" disabled={saving}>
            {saving ? <Spinner size={14} /> : null} Save product
          </button>
        </div>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="adm-label">
        {label}
        {required && <span style={{ color: "#9c3a3a" }}> *</span>}
      </span>
      {children}
      {hint && <span className="adm-hint block">{hint}</span>}
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4" />
      {label}
    </label>
  );
}

function TagInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [draft, setDraft] = useState("");
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span key={tag} className="adm-pill" style={{ background: "var(--adm-bg)", color: "var(--adm-text)" }}>
            {tag}
            <button type="button" onClick={() => onChange(tags.filter((t) => t !== tag))} aria-label={`Remove tag ${tag}`}>
              <X size={11} strokeWidth={2.4} />
            </button>
          </span>
        ))}
      </div>
      <input
        className="adm-input"
        value={draft}
        placeholder="everyday, gifting…"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            const value = draft.trim().replace(/,$/, "");
            if (value && !tags.includes(value)) onChange([...tags, value]);
            setDraft("");
          }
        }}
      />
    </div>
  );
}

function SortableImage({
  image,
  index,
  onAlt,
  onRemove,
}: {
  image: { url: string; alt: string };
  index: number;
  onAlt: (alt: string) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: image.url });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="rounded-xl p-2"
    >
      <div className="relative overflow-hidden rounded-lg" style={{ aspectRatio: "4 / 5", background: "var(--adm-bg)" }}>
        <Image src={image.url} alt="" fill sizes="240px" className="object-cover" />
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reorder photo ${index + 1}`}
          className="absolute left-1.5 top-1.5 cursor-grab rounded-md p-1 active:cursor-grabbing"
          style={{ background: "rgba(255,255,255,0.92)" }}
        >
          <GripVertical size={14} strokeWidth={1.8} />
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove photo ${index + 1}`}
          className="absolute right-1.5 top-1.5 rounded-md p-1"
          style={{ background: "rgba(255,255,255,0.92)", color: "#9c3a3a" }}
        >
          <Trash2 size={14} strokeWidth={1.7} />
        </button>
        {index === 0 && (
          <span className="absolute bottom-1.5 left-1.5 adm-pill" style={{ background: "rgba(255,255,255,0.94)", color: "var(--adm-text)" }}>
            Main photo
          </span>
        )}
      </div>
      <label className="sr-only" htmlFor={`alt-${index}`}>Photo description</label>
      <input
        id={`alt-${index}`}
        className="adm-input mt-2 px-2 py-1 text-xs"
        value={image.alt}
        onChange={(event) => onAlt(event.target.value)}
        placeholder="Describe the photo (helps Google)"
      />
    </div>
  );
}
