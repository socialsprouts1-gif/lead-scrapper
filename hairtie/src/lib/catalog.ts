import "server-only";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export const PRODUCT_CARD_SELECT = {
  id: true,
  name: true,
  slug: true,
  price: true,
  mrp: true,
  stock: true,
  trackInventory: true,
  lowStockThreshold: true,
  isNewArrival: true,
  isBestseller: true,
  isTrending: true,
  isOnSale: true,
  ratingSum: true,
  reviewCount: true,
  shortDescription: true,
  images: { orderBy: { position: "asc" }, take: 2, select: { url: true, alt: true } },
  category: { select: { name: true, slug: true } },
  variants: {
    where: { isActive: true },
    orderBy: { position: "asc" },
    select: { id: true, name: true, color: true, colorHex: true, size: true, stock: true, price: true },
  },
} satisfies Prisma.ProductSelect;

export type ProductCard = Prisma.ProductGetPayload<{ select: typeof PRODUCT_CARD_SELECT }>;

export { SORT_OPTIONS, type SortValue } from "@/lib/shop-options";

function orderFor(sort: string | undefined): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "price-asc":
      return [{ price: "asc" }, { createdAt: "desc" }];
    case "price-desc":
      return [{ price: "desc" }, { createdAt: "desc" }];
    case "popular":
      return [{ viewCount: "desc" }, { salesCount: "desc" }];
    case "bestselling":
      return [{ salesCount: "desc" }, { reviewCount: "desc" }];
    default:
      return [{ position: "asc" }, { createdAt: "desc" }];
  }
}

export type ShopFilters = {
  q?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  colors?: string[];
  tags?: string[];
  availability?: "in-stock" | "all";
  sort?: string;
  page?: number;
  perPage?: number;
};

export function buildProductWhere(filters: ShopFilters, categoryIds?: string[]): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { status: "ACTIVE" };
  const and: Prisma.ProductWhereInput[] = [];

  if (filters.q) {
    const q = filters.q.trim();
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { shortDescription: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
        { material: { contains: q, mode: "insensitive" } },
        { category: { name: { contains: q, mode: "insensitive" } } },
        { tags: { some: { tag: { name: { contains: q, mode: "insensitive" } } } } },
      ],
    });
  }

  if (categoryIds?.length) and.push({ categoryId: { in: categoryIds } });

  if (filters.minPrice !== undefined) and.push({ price: { gte: filters.minPrice } });
  if (filters.maxPrice !== undefined) and.push({ price: { lte: filters.maxPrice } });

  if (filters.colors?.length) {
    and.push({ variants: { some: { color: { in: filters.colors }, isActive: true } } });
  }

  if (filters.tags?.length) {
    and.push({ tags: { some: { tag: { slug: { in: filters.tags } } } } });
  }

  if (filters.availability === "in-stock") {
    and.push({
      OR: [
        { trackInventory: false },
        { stock: { gt: 0 } },
        { variants: { some: { stock: { gt: 0 }, isActive: true } } },
      ],
    });
  }

  if (and.length) where.AND = and;
  return where;
}

/** Every descendant category id, so browsing a parent shows its children too. */
export async function categoryTreeIds(slug: string) {
  const category = await prisma.category.findUnique({
    where: { slug },
    select: { id: true, children: { select: { id: true } } },
  });
  if (!category) return null;
  return [category.id, ...category.children.map((c) => c.id)];
}

export async function searchProducts(filters: ShopFilters) {
  const perPage = Math.min(filters.perPage ?? 24, 60);
  const page = Math.max(filters.page ?? 1, 1);

  let categoryIds: string[] | undefined;
  if (filters.category) {
    const ids = await categoryTreeIds(filters.category);
    if (!ids) return { products: [], total: 0, page, perPage, pageCount: 0 };
    categoryIds = ids;
  }

  const where = buildProductWhere(filters, categoryIds);
  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      select: PRODUCT_CARD_SELECT,
      orderBy: orderFor(filters.sort),
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.product.count({ where }),
  ]);

  return { products, total, page, perPage, pageCount: Math.ceil(total / perPage) };
}

/** Colours, tags and the price range available across the live catalogue. */
export async function getShopFacets() {
  const [colors, tags, range, categories] = await Promise.all([
    prisma.productVariant.findMany({
      where: { isActive: true, color: { not: null }, product: { status: "ACTIVE" } },
      distinct: ["color"],
      select: { color: true, colorHex: true },
      orderBy: { color: "asc" },
    }),
    prisma.tag.findMany({
      where: { products: { some: { product: { status: "ACTIVE" } } } },
      select: { name: true, slug: true },
      orderBy: { name: "asc" },
    }),
    prisma.product.aggregate({
      where: { status: "ACTIVE" },
      _min: { price: true },
      _max: { price: true },
    }),
    prisma.category.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
        _count: { select: { products: { where: { status: "ACTIVE" } } } },
      },
      orderBy: [{ position: "asc" }, { name: "asc" }],
    }),
  ]);

  return {
    colors: colors.filter((c) => c.color) as { color: string; colorHex: string | null }[],
    tags,
    minPrice: range._min.price ?? 0,
    maxPrice: range._max.price ?? 500000,
    categories,
  };
}

/** Resolves a page-builder product block's "source" setting into products. */
export async function productsForSection(settings: Record<string, unknown>) {
  const limit = Math.min(Number(settings.limit) || 8, 24);
  const source = String(settings.source ?? "newest");

  if (source === "manual") {
    const ids = Array.isArray(settings.productIds) ? (settings.productIds as string[]) : [];
    if (ids.length === 0) return [];
    const rows = await prisma.product.findMany({
      where: { id: { in: ids }, status: "ACTIVE" },
      select: PRODUCT_CARD_SELECT,
    });
    // Preserve the order the admin arranged them in.
    return ids.map((id) => rows.find((r) => r.id === id)).filter(Boolean).slice(0, limit) as ProductCard[];
  }

  const where: Prisma.ProductWhereInput = { status: "ACTIVE" };
  let orderBy: Prisma.ProductOrderByWithRelationInput[] = [{ createdAt: "desc" }];

  switch (source) {
    case "bestsellers":
      where.isBestseller = true;
      orderBy = [{ salesCount: "desc" }, { createdAt: "desc" }];
      break;
    case "trending":
      where.isTrending = true;
      orderBy = [{ viewCount: "desc" }, { createdAt: "desc" }];
      break;
    case "featured":
      where.isFeatured = true;
      orderBy = [{ position: "asc" }, { createdAt: "desc" }];
      break;
    case "sale":
      where.isOnSale = true;
      break;
    case "category": {
      const categoryId = String(settings.categoryId ?? "");
      if (!categoryId) return [];
      const children = await prisma.category.findMany({
        where: { parentId: categoryId },
        select: { id: true },
      });
      where.categoryId = { in: [categoryId, ...children.map((c) => c.id)] };
      break;
    }
    default:
      break;
  }

  return prisma.product.findMany({ where, select: PRODUCT_CARD_SELECT, orderBy, take: limit });
}

export function averageRating(product: { ratingSum: number; reviewCount: number }) {
  if (!product.reviewCount) return 0;
  return Math.round((product.ratingSum / product.reviewCount) * 10) / 10;
}

export function stockState(product: {
  stock: number;
  trackInventory: boolean;
  lowStockThreshold: number;
  variants?: { stock: number }[];
}) {
  if (!product.trackInventory) return "in-stock" as const;
  const total = product.variants?.length
    ? product.variants.reduce((sum, v) => sum + v.stock, 0)
    : product.stock;
  if (total <= 0) return "out-of-stock" as const;
  if (total <= product.lowStockThreshold) return "low" as const;
  return "in-stock" as const;
}
