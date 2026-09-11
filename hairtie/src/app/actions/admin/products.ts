"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAdminOrNull } from "@/lib/auth";
import { slugify, uniqueSlug } from "@/lib/utils";

export type AdminResult<T = unknown> = { ok: boolean; message?: string; data?: T };

async function guard() {
  const admin = await getAdminOrNull();
  if (!admin) throw new Error("Not authorised.");
  return admin;
}

/** Prices are entered in rupees in the admin and stored in paise. */
const money = z
  .union([z.string(), z.number()])
  .transform((value) => {
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

export type ProductInput = z.input<typeof productSchema>;

async function syncTags(tagNames: string[]) {
  const ids: string[] = [];
  for (const name of tagNames) {
    const slug = slugify(name);
    if (!slug) continue;
    const tag = await prisma.tag.upsert({
      where: { slug },
      create: { name: name.trim(), slug },
      update: {},
    });
    ids.push(tag.id);
  }
  return ids;
}

function corePayload(data: z.output<typeof productSchema>) {
  return {
    name: data.name,
    sku: data.sku,
    brand: data.brand || "Hairtie",
    categoryId: data.categoryId || null,
    shortDescription: data.shortDescription || null,
    description: data.description || "",
    mrp: data.mrp,
    price: data.price,
    costPrice: data.costPrice ?? null,
    stock: data.stock,
    lowStockThreshold: data.lowStockThreshold,
    trackInventory: data.trackInventory,
    allowBackorder: data.allowBackorder,
    hsnCode: data.hsnCode || null,
    gstRate: data.gstRate,
    priceIncludesTax: data.priceIncludesTax,
    weightGrams: data.weightGrams ? Math.round(data.weightGrams) : null,
    lengthCm: data.lengthCm,
    widthCm: data.widthCm,
    heightCm: data.heightCm,
    material: data.material || null,
    careInstructions: data.careInstructions || null,
    countryOfOrigin: data.countryOfOrigin || "India",
    videoUrl: data.videoUrl || null,
    isNewArrival: data.isNewArrival,
    isBestseller: data.isBestseller,
    isTrending: data.isTrending,
    isFeatured: data.isFeatured,
    isOnSale: data.isOnSale,
    status: data.status,
    seoTitle: data.seoTitle || null,
    seoDescription: data.seoDescription || null,
    seoKeywords: data.seoKeywords || null,
    ogImageUrl: data.ogImageUrl || null,
    canonicalUrl: data.canonicalUrl || null,
  };
}

function validationMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "Please check the highlighted fields.";
}

export async function createProduct(input: unknown): Promise<AdminResult<{ id: string }>> {
  await guard();
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: validationMessage(parsed.error) };
  const data = parsed.data;

  const existingSku = await prisma.product.findUnique({ where: { sku: data.sku }, select: { id: true } });
  if (existingSku) return { ok: false, message: `SKU ${data.sku} is already used by another product.` };

  const slug = await uniqueSlug(data.slug || data.name, async (candidate) =>
    Boolean(await prisma.product.findUnique({ where: { slug: candidate }, select: { id: true } })),
  );
  const tagIds = await syncTags(data.tags);
  const maxPosition = await prisma.product.aggregate({ _max: { position: true } });

  const product = await prisma.product.create({
    data: {
      ...corePayload(data),
      slug,
      position: (maxPosition._max.position ?? 0) + 1,
      publishedAt: data.status === "ACTIVE" ? new Date() : null,
      images: { create: data.images.map((image, index) => ({ url: image.url, alt: image.alt ?? "", position: index })) },
      variants: {
        create: data.variants.map((variant, index) => ({
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
          position: index,
        })),
      },
      attributes: {
        create: data.attributes.map((attribute, index) => ({
          name: attribute.name,
          value: attribute.value,
          group: attribute.group || "Specifications",
          position: index,
        })),
      },
      tags: { create: tagIds.map((tagId) => ({ tagId })) },
    },
    select: { id: true, slug: true },
  });

  revalidatePath("/", "layout");
  return { ok: true, message: "Product saved.", data: { id: product.id } };
}

export async function updateProduct(productId: string, input: unknown): Promise<AdminResult> {
  await guard();
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: validationMessage(parsed.error) };
  const data = parsed.data;

  const current = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, slug: true, status: true, publishedAt: true },
  });
  if (!current) return { ok: false, message: "That product no longer exists." };

  const skuOwner = await prisma.product.findUnique({ where: { sku: data.sku }, select: { id: true } });
  if (skuOwner && skuOwner.id !== productId) {
    return { ok: false, message: `SKU ${data.sku} is already used by another product.` };
  }

  const desiredSlug = slugify(data.slug || data.name);
  const slug =
    desiredSlug === current.slug
      ? current.slug
      : await uniqueSlug(desiredSlug, async (candidate) => {
          const found = await prisma.product.findUnique({ where: { slug: candidate }, select: { id: true } });
          return Boolean(found && found.id !== productId);
        });

  const tagIds = await syncTags(data.tags);
  const keptVariantIds = data.variants.map((variant) => variant.id).filter(Boolean) as string[];

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: productId },
      data: {
        ...corePayload(data),
        slug,
        publishedAt:
          data.status === "ACTIVE" ? (current.publishedAt ?? new Date()) : current.publishedAt,
      },
    });

    // Images and attributes are simple lists — replacing them wholesale keeps
    // the editor's drag-to-reorder behaviour honest.
    await tx.productImage.deleteMany({ where: { productId } });
    if (data.images.length) {
      await tx.productImage.createMany({
        data: data.images.map((image, index) => ({
          productId,
          url: image.url,
          alt: image.alt ?? "",
          position: index,
        })),
      });
    }

    await tx.productAttribute.deleteMany({ where: { productId } });
    if (data.attributes.length) {
      await tx.productAttribute.createMany({
        data: data.attributes.map((attribute, index) => ({
          productId,
          name: attribute.name,
          value: attribute.value,
          group: attribute.group || "Specifications",
          position: index,
        })),
      });
    }

    // Variants are updated in place: deleting them would orphan the order items
    // and cart rows that point at them.
    await tx.productVariant.deleteMany({
      where: { productId, id: { notIn: keptVariantIds.length ? keptVariantIds : ["__none__"] } },
    });

    for (const [index, variant] of data.variants.entries()) {
      const payload = {
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
        position: index,
      };
      if (variant.id) {
        await tx.productVariant.update({ where: { id: variant.id }, data: payload });
      } else {
        await tx.productVariant.create({ data: { ...payload, productId } });
      }
    }

    await tx.productTag.deleteMany({ where: { productId } });
    if (tagIds.length) {
      await tx.productTag.createMany({ data: tagIds.map((tagId) => ({ productId, tagId })) });
    }
  });

  revalidatePath("/", "layout");
  return { ok: true, message: "Product saved." };
}

export async function deleteProduct(productId: string): Promise<AdminResult> {
  await guard();
  const orderedCount = await prisma.orderItem.count({ where: { productId } });
  if (orderedCount > 0) {
    // Deleting would blank the product name on past orders, so archive instead.
    await prisma.product.update({ where: { id: productId }, data: { status: "ARCHIVED" } });
    revalidatePath("/", "layout");
    return {
      ok: true,
      message: "This product has been ordered before, so it was archived rather than deleted.",
    };
  }
  await prisma.product.delete({ where: { id: productId } });
  revalidatePath("/", "layout");
  return { ok: true, message: "Product deleted." };
}

export async function setProductStatus(
  productId: string,
  status: "DRAFT" | "ACTIVE" | "ARCHIVED",
): Promise<AdminResult> {
  await guard();
  await prisma.product.update({
    where: { id: productId },
    data: { status, publishedAt: status === "ACTIVE" ? new Date() : undefined },
  });
  revalidatePath("/", "layout");
  const labels = { DRAFT: "moved to drafts", ACTIVE: "published", ARCHIVED: "archived" };
  return { ok: true, message: `Product ${labels[status]}.` };
}

export async function duplicateProduct(productId: string): Promise<AdminResult<{ id: string }>> {
  await guard();
  const source = await prisma.product.findUnique({
    where: { id: productId },
    include: { images: true, variants: true, attributes: true, tags: true },
  });
  if (!source) return { ok: false, message: "That product no longer exists." };

  const slug = await uniqueSlug(`${source.slug}-copy`, async (candidate) =>
    Boolean(await prisma.product.findUnique({ where: { slug: candidate }, select: { id: true } })),
  );
  const sku = await uniqueSlug(`${source.sku}-COPY`, async (candidate) =>
    Boolean(await prisma.product.findUnique({ where: { sku: candidate }, select: { id: true } })),
  );

  const copy = await prisma.product.create({
    data: {
      name: `${source.name} (copy)`,
      slug,
      sku: sku.toUpperCase(),
      brand: source.brand,
      categoryId: source.categoryId,
      shortDescription: source.shortDescription,
      description: source.description,
      mrp: source.mrp,
      price: source.price,
      costPrice: source.costPrice,
      stock: source.stock,
      lowStockThreshold: source.lowStockThreshold,
      trackInventory: source.trackInventory,
      allowBackorder: source.allowBackorder,
      hsnCode: source.hsnCode,
      gstRate: source.gstRate,
      priceIncludesTax: source.priceIncludesTax,
      weightGrams: source.weightGrams,
      lengthCm: source.lengthCm,
      widthCm: source.widthCm,
      heightCm: source.heightCm,
      material: source.material,
      careInstructions: source.careInstructions,
      countryOfOrigin: source.countryOfOrigin,
      videoUrl: source.videoUrl,
      // A copy always starts as a draft so it cannot go live by accident.
      status: "DRAFT",
      images: { create: source.images.map((i) => ({ url: i.url, alt: i.alt, position: i.position })) },
      variants: {
        create: source.variants.map((v, index) => ({
          name: v.name,
          sku: `${sku.toUpperCase()}-${index + 1}`,
          color: v.color,
          colorHex: v.colorHex,
          size: v.size,
          price: v.price,
          mrp: v.mrp,
          stock: v.stock,
          imageUrl: v.imageUrl,
          position: v.position,
        })),
      },
      attributes: {
        create: source.attributes.map((a) => ({
          name: a.name, value: a.value, group: a.group, position: a.position,
        })),
      },
      tags: { create: source.tags.map((t) => ({ tagId: t.tagId })) },
    },
    select: { id: true },
  });

  revalidatePath("/admin/products");
  return { ok: true, message: "Product duplicated as a draft.", data: { id: copy.id } };
}

export async function updateStock(productId: string, stock: number): Promise<AdminResult> {
  await guard();
  if (!Number.isFinite(stock) || stock < 0) return { ok: false, message: "Enter a valid stock number." };
  await prisma.product.update({ where: { id: productId }, data: { stock: Math.round(stock) } });
  revalidatePath("/", "layout");
  return { ok: true, message: "Stock updated." };
}

export async function bulkProductAction(
  productIds: string[],
  action: "publish" | "draft" | "archive" | "delete",
): Promise<AdminResult> {
  await guard();
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
  await prisma.product.updateMany({ where: { id: { in: productIds } }, data: { status } });
  revalidatePath("/", "layout");
  return { ok: true, message: `${productIds.length} ${productIds.length === 1 ? "product" : "products"} updated.` };
}
