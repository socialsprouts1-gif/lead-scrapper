"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createId, mutate, now, store } from "@/lib/store";
import { productById } from "@/lib/catalog";
import { slugify } from "@/lib/utils";
import type { Product, ProductVariant } from "@/lib/types";

export type AdminResult<T = unknown> = { ok: boolean; message?: string; data?: T };

/** Prices are entered in rupees in the admin and stored in paise. */
const money = z.union([z.string(), z.number()]).transform((value) => {
  const n = typeof value === "string" ? Number(value.replace(/[^\d.-]/g, "")) : value;
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
});

const optionalNumber = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((value) => {
    if (value === null || value === undefined || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  });

const productSchema = z.object({
  name: z.string().trim().min(2, "Please give the product a name.").max(160),
  slug: z.string().trim().max(80).optional().or(z.literal("")),
  sku: z.string().trim().min(1, "Please enter a SKU.").max(60),
  brand: z.string().trim().max(60).optional().or(z.literal("")),
  categoryId: z.string().optional().or(z.literal("")),
  shortDescription: z.string().trim().max(300).optional().or(z.literal("")),
  description: z.string().trim().max(8000).optional().or(z.literal("")),

  mrp: money,
  price: money,
  costPrice: money.optional(),

  stock: z.coerce.number().int().min(0).max(1_000_000),
  lowStockThreshold: z.coerce.number().int().min(0).max(10_000),
  trackInventory: z.boolean(),
  allowBackorder: z.boolean(),

  hsnCode: z.string().trim().max(20).optional().or(z.literal("")),
  gstRate: z.coerce.number().int().min(0).max(50),
  priceIncludesTax: z.boolean(),

  weightGrams: optionalNumber,
  lengthCm: optionalNumber,
  widthCm: optionalNumber,
  heightCm: optionalNumber,
  material: z.string().trim().max(160).optional().or(z.literal("")),
  careInstructions: z.string().trim().max(1000).optional().or(z.literal("")),
  countryOfOrigin: z.string().trim().max(60).optional().or(z.literal("")),
  videoUrl: z.string().trim().max(400).optional().or(z.literal("")),

  isNewArrival: z.boolean(),
  isBestseller: z.boolean(),
  isTrending: z.boolean(),
  isFeatured: z.boolean(),
  isOnSale: z.boolean(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),

  seoTitle: z.string().trim().max(160).optional().or(z.literal("")),
  seoDescription: z.string().trim().max(320).optional().or(z.literal("")),
  seoKeywords: z.string().trim().max(320).optional().or(z.literal("")),
  ogImageUrl: z.string().trim().max(500).optional().or(z.literal("")),
  canonicalUrl: z.string().trim().max(500).optional().or(z.literal("")),

  images: z.array(z.object({ url: z.string().min(1), alt: z.string().max(200).optional() })).max(15),
  variants: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().trim().min(1).max(80),
        sku: z.string().trim().max(60).optional().or(z.literal("")),
        color: z.string().trim().max(50).optional().or(z.literal("")),
        colorHex: z.string().trim().max(20).optional().or(z.literal("")),
        size: z.string().trim().max(30).optional().or(z.literal("")),
        price: money.optional(),
        mrp: money.optional(),
        stock: z.coerce.number().int().min(0).max(1_000_000),
        imageUrl: z.string().trim().max(500).optional().or(z.literal("")),
        isActive: z.boolean().optional(),
      }),
    )
    .max(40),
  attributes: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(60),
        value: z.string().trim().min(1).max(300),
        group: z.string().trim().max(60).optional().or(z.literal("")),
      }),
    )
    .max(60),
  tags: z.array(z.string().trim().min(1).max(40)).max(20),
});

type ParsedProduct = z.output<typeof productSchema>;

function validationMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "Please check the highlighted fields.";
}

function uniqueSlug(base: string, excludeId?: string) {
  const root = slugify(base) || "product";
  let candidate = root;
  let n = 2;
  while (store().products.some((product) => product.slug === candidate && product.id !== excludeId)) {
    candidate = `${root}-${n}`;
    n += 1;
  }
  return candidate;
}

function buildVariants(data: ParsedProduct): ProductVariant[] {
  return data.variants.map((variant, index) => ({
    id: variant.id ?? createId("var"),
    name: variant.name,
    sku: variant.sku || `${data.sku}-${index + 1}`,
    color: variant.color || null,
    colorHex: variant.colorHex || null,
    size: variant.size || null,
    price: variant.price || null,
    mrp: variant.mrp || null,
    stock: variant.stock,
    imageUrl: variant.imageUrl || null,
    isActive: variant.isActive ?? true,
  }));
}

function applyCore(product: Product, data: ParsedProduct) {
  product.name = data.name;
  product.sku = data.sku;
  product.brand = data.brand || "Hairtie";
  product.categoryId = data.categoryId || null;
  product.shortDescription = data.shortDescription || "";
  product.description = data.description || "";
  product.mrp = data.mrp;
  product.price = data.price;
  product.costPrice = data.costPrice ?? null;
  product.stock = data.stock;
  product.lowStockThreshold = data.lowStockThreshold;
  product.trackInventory = data.trackInventory;
  product.allowBackorder = data.allowBackorder;
  product.hsnCode = data.hsnCode || null;
  product.gstRate = data.gstRate;
  product.priceIncludesTax = data.priceIncludesTax;
  product.weightGrams = data.weightGrams ? Math.round(data.weightGrams) : null;
  product.lengthCm = data.lengthCm;
  product.widthCm = data.widthCm;
  product.heightCm = data.heightCm;
  product.material = data.material || null;
  product.careInstructions = data.careInstructions || null;
  product.countryOfOrigin = data.countryOfOrigin || "India";
  product.videoUrl = data.videoUrl || null;
  product.isNewArrival = data.isNewArrival;
  product.isBestseller = data.isBestseller;
  product.isTrending = data.isTrending;
  product.isFeatured = data.isFeatured;
  product.isOnSale = data.isOnSale;
  product.status = data.status;
  product.seoTitle = data.seoTitle || null;
  product.seoDescription = data.seoDescription || null;
  product.seoKeywords = data.seoKeywords || null;
  product.ogImageUrl = data.ogImageUrl || null;
  product.canonicalUrl = data.canonicalUrl || null;
  product.images = data.images.map((image) => ({ url: image.url, alt: image.alt ?? "" }));
  product.variants = buildVariants(data);
  product.attributes = data.attributes.map((attribute) => ({
    name: attribute.name,
    value: attribute.value,
    group: attribute.group || "Specifications",
  }));
  product.tags = data.tags;
  product.updatedAt = now();
}

export async function createProduct(input: unknown): Promise<AdminResult<{ id: string }>> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: validationMessage(parsed.error) };
  const data = parsed.data;

  if (store().products.some((product) => product.sku === data.sku)) {
    return { ok: false, message: `SKU ${data.sku} is already used by another product.` };
  }

  const id = createId("prd");
  mutate((db) => {
    const maxPosition = db.products.reduce((max, product) => Math.max(max, product.position), 0);
    const product: Product = {
      id,
      slug: uniqueSlug(data.slug || data.name),
      position: maxPosition + 1,
      viewCount: 0,
      salesCount: 0,
      ratingSum: 0,
      reviewCount: 0,
      createdAt: now(),
      updatedAt: now(),
      // applyCore fills in everything else.
    } as Product;
    applyCore(product, data);
    db.products.push(product);
  });

  revalidatePath("/", "layout");
  return { ok: true, message: "Product saved.", data: { id } };
}

export async function updateProduct(productId: string, input: unknown): Promise<AdminResult> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: validationMessage(parsed.error) };
  const data = parsed.data;

  const current = productById(productId);
  if (!current) return { ok: false, message: "That product no longer exists." };

  if (store().products.some((product) => product.sku === data.sku && product.id !== productId)) {
    return { ok: false, message: `SKU ${data.sku} is already used by another product.` };
  }

  const desired = slugify(data.slug || data.name);
  const slug = desired === current.slug ? current.slug : uniqueSlug(desired, productId);

  mutate((db) => {
    const product = db.products.find((entry) => entry.id === productId);
    if (!product) return;
    applyCore(product, data);
    product.slug = slug;
  });

  revalidatePath("/", "layout");
  return { ok: true, message: "Product saved." };
}

export async function deleteProduct(productId: string): Promise<AdminResult> {
  const ordered = store().orders.some((order) =>
    order.items.some((item) => item.productId === productId),
  );

  if (ordered) {
    // Deleting would blank the product name on past orders, so archive instead.
    mutate((db) => {
      const product = db.products.find((entry) => entry.id === productId);
      if (product) product.status = "ARCHIVED";
    });
    revalidatePath("/", "layout");
    return {
      ok: true,
      message: "This product has been ordered before, so it was archived rather than deleted.",
    };
  }

  mutate((db) => {
    db.products = db.products.filter((product) => product.id !== productId);
    db.reviews = db.reviews.filter((review) => review.productId !== productId);
    for (const cart of db.carts) {
      cart.items = cart.items.filter((item) => item.productId !== productId);
    }
    for (const look of db.looks) {
      look.productIds = look.productIds.filter((id) => id !== productId);
    }
  });

  revalidatePath("/", "layout");
  return { ok: true, message: "Product deleted." };
}

export async function setProductStatus(
  productId: string,
  status: "DRAFT" | "ACTIVE" | "ARCHIVED",
): Promise<AdminResult> {
  mutate((db) => {
    const product = db.products.find((entry) => entry.id === productId);
    if (product) {
      product.status = status;
      product.updatedAt = now();
    }
  });
  revalidatePath("/", "layout");
  const labels = { DRAFT: "moved to drafts", ACTIVE: "published", ARCHIVED: "archived" };
  return { ok: true, message: `Product ${labels[status]}.` };
}

export async function duplicateProduct(productId: string): Promise<AdminResult<{ id: string }>> {
  const source = productById(productId);
  if (!source) return { ok: false, message: "That product no longer exists." };

  const id = createId("prd");
  mutate((db) => {
    let sku = `${source.sku}-COPY`;
    let n = 2;
    while (db.products.some((product) => product.sku === sku)) {
      sku = `${source.sku}-COPY${n}`;
      n += 1;
    }

    db.products.push({
      ...structuredClone(source),
      id,
      name: `${source.name} (copy)`,
      slug: uniqueSlug(`${source.slug}-copy`),
      sku,
      // A copy always starts as a draft so it cannot go live by accident.
      status: "DRAFT",
      viewCount: 0,
      salesCount: 0,
      ratingSum: 0,
      reviewCount: 0,
      variants: source.variants.map((variant, index) => ({
        ...variant,
        id: createId("var"),
        sku: `${sku}-${index + 1}`,
      })),
      createdAt: now(),
      updatedAt: now(),
    });
  });

  revalidatePath("/admin/products");
  return { ok: true, message: "Product duplicated as a draft.", data: { id } };
}

export async function updateStock(productId: string, stock: number): Promise<AdminResult> {
  if (!Number.isFinite(stock) || stock < 0) return { ok: false, message: "Enter a valid stock number." };
  mutate((db) => {
    const product = db.products.find((entry) => entry.id === productId);
    if (product) {
      product.stock = Math.round(stock);
      product.updatedAt = now();
    }
  });
  revalidatePath("/", "layout");
  return { ok: true, message: "Stock updated." };
}

export async function bulkProductAction(
  productIds: string[],
  action: "publish" | "draft" | "archive" | "delete",
): Promise<AdminResult> {
  if (productIds.length === 0) return { ok: false, message: "Select at least one product." };

  if (action === "delete") {
    let archived = 0;
    for (const id of productIds) {
      const result = await deleteProduct(id);
      if (result.message?.includes("archived")) archived += 1;
    }
    revalidatePath("/", "layout");
    return {
      ok: true,
      message:
        archived > 0
          ? `Done. ${archived} ${archived === 1 ? "product was" : "products were"} archived instead of deleted because they appear on past orders.`
          : `${productIds.length} ${productIds.length === 1 ? "product" : "products"} deleted.`,
    };
  }

  const status = action === "publish" ? "ACTIVE" : action === "draft" ? "DRAFT" : "ARCHIVED";
  mutate((db) => {
    for (const product of db.products) {
      if (productIds.includes(product.id)) {
        product.status = status;
        product.updatedAt = now();
      }
    }
  });

  revalidatePath("/", "layout");
  return { ok: true, message: `${productIds.length} ${productIds.length === 1 ? "product" : "products"} updated.` };
}
