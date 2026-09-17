import "server-only";
import { store } from "@/lib/store";
import type { Category, Product } from "@/lib/types";

export { SORT_OPTIONS, type SortValue } from "@/lib/shop-options";

/* -------------------------------------------------------------------------- */
/* Lookups                                                                    */
/* -------------------------------------------------------------------------- */

export function allProducts() {
  return store().products;
}

export function liveProducts() {
  return store().products.filter((product) => product.status === "ACTIVE");
}

export function productById(id: string) {
  return store().products.find((product) => product.id === id) ?? null;
}

export function productBySlug(slug: string) {
  return store().products.find((product) => product.slug === slug) ?? null;
}

export function productsByIds(ids: string[]) {
  const map = new Map(store().products.map((product) => [product.id, product]));
  return ids.map((id) => map.get(id)).filter(Boolean) as Product[];
}

export function allCategories() {
  return [...store().categories].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
}

export function categoryById(id: string) {
  return store().categories.find((category) => category.id === id) ?? null;
}

export function categoryBySlug(slug: string) {
  return store().categories.find((category) => category.slug === slug) ?? null;
}

export function childrenOf(categoryId: string) {
  return allCategories().filter((category) => category.parentId === categoryId);
}

/** A category and everything nested inside it, so a parent shows its children's products. */
export function categoryTreeIds(slug: string) {
  const category = categoryBySlug(slug);
  if (!category) return null;
  return [category.id, ...childrenOf(category.id).map((child) => child.id)];
}

export function productCount(categoryId: string, liveOnly = true) {
  return store().products.filter(
    (product) => product.categoryId === categoryId && (!liveOnly || product.status === "ACTIVE"),
  ).length;
}

/* -------------------------------------------------------------------------- */
/* Derived values                                                             */
/* -------------------------------------------------------------------------- */

export function averageRating(product: { ratingSum: number; reviewCount: number }) {
  if (!product.reviewCount) return 0;
  return Math.round((product.ratingSum / product.reviewCount) * 10) / 10;
}

/** Total sellable units: the sum of variant stock when a product has variants. */
export function stockOf(product: Product) {
  if (!product.trackInventory) return Number.MAX_SAFE_INTEGER;
  const active = product.variants.filter((variant) => variant.isActive);
  return active.length ? active.reduce((sum, variant) => sum + variant.stock, 0) : product.stock;
}

export function stockState(product: Product) {
  const total = stockOf(product);
  if (total === Number.MAX_SAFE_INTEGER) return "in-stock" as const;
  if (total <= 0) return "out-of-stock" as const;
  if (total <= product.lowStockThreshold) return "low" as const;
  return "in-stock" as const;
}

/* -------------------------------------------------------------------------- */
/* Shop search, filters and sorting                                           */
/* -------------------------------------------------------------------------- */

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

function sortProducts(products: Product[], sort: string | undefined) {
  const list = [...products];
  switch (sort) {
    case "price-asc":
      return list.sort((a, b) => a.price - b.price || b.createdAt.localeCompare(a.createdAt));
    case "price-desc":
      return list.sort((a, b) => b.price - a.price || b.createdAt.localeCompare(a.createdAt));
    case "popular":
      return list.sort((a, b) => b.viewCount - a.viewCount || b.salesCount - a.salesCount);
    case "bestselling":
      return list.sort((a, b) => b.salesCount - a.salesCount || b.reviewCount - a.reviewCount);
    default:
      return list.sort((a, b) => a.position - b.position || b.createdAt.localeCompare(a.createdAt));
  }
}

function matchesSearch(product: Product, term: string, categoryName: string | null) {
  const q = term.toLowerCase();
  return (
    product.name.toLowerCase().includes(q) ||
    product.shortDescription.toLowerCase().includes(q) ||
    product.description.toLowerCase().includes(q) ||
    product.sku.toLowerCase().includes(q) ||
    (product.material ?? "").toLowerCase().includes(q) ||
    product.tags.some((tag) => tag.toLowerCase().includes(q)) ||
    (categoryName ?? "").toLowerCase().includes(q)
  );
}

export function searchProducts(filters: ShopFilters) {
  const perPage = Math.min(filters.perPage ?? 24, 60);
  const page = Math.max(filters.page ?? 1, 1);

  let categoryIds: string[] | null = null;
  if (filters.category) {
    categoryIds = categoryTreeIds(filters.category);
    if (!categoryIds) return { products: [] as Product[], total: 0, page, perPage, pageCount: 0 };
  }

  const categoryNames = new Map(store().categories.map((category) => [category.id, category.name]));

  const matched = liveProducts().filter((product) => {
    if (categoryIds && (!product.categoryId || !categoryIds.includes(product.categoryId))) return false;
    if (filters.q && !matchesSearch(product, filters.q.trim(), categoryNames.get(product.categoryId ?? "") ?? null)) {
      return false;
    }
    if (filters.minPrice !== undefined && product.price < filters.minPrice) return false;
    if (filters.maxPrice !== undefined && product.price > filters.maxPrice) return false;
    if (filters.colors?.length) {
      const has = product.variants.some(
        (variant) => variant.isActive && variant.color && filters.colors!.includes(variant.color),
      );
      if (!has) return false;
    }
    if (filters.tags?.length) {
      const slugs = product.tags.map((tag) => tag.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
      if (!filters.tags.some((tag) => slugs.includes(tag))) return false;
    }
    if (filters.availability === "in-stock" && stockOf(product) <= 0) return false;
    return true;
  });

  const sorted = sortProducts(matched, filters.sort);
  const total = sorted.length;

  return {
    products: sorted.slice((page - 1) * perPage, page * perPage),
    total,
    page,
    perPage,
    pageCount: Math.ceil(total / perPage),
  };
}

/** Colours, tags and the price range available across the live catalogue. */
export function getShopFacets() {
  const live = liveProducts();

  const colorMap = new Map<string, string | null>();
  for (const product of live) {
    for (const variant of product.variants) {
      if (variant.isActive && variant.color && !colorMap.has(variant.color)) {
        colorMap.set(variant.color, variant.colorHex);
      }
    }
  }

  const tagMap = new Map<string, string>();
  for (const product of live) {
    for (const tag of product.tags) {
      const slug = tag.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      if (!tagMap.has(slug)) tagMap.set(slug, tag.replace(/(^|\s)\S/g, (c) => c.toUpperCase()));
    }
  }

  const prices = live.map((product) => product.price);

  const categories: (Category & { productCount: number })[] = allCategories()
    .filter((category) => category.isActive)
    .map((category) => ({ ...category, productCount: productCount(category.id) }));

  return {
    colors: [...colorMap.entries()]
      .map(([color, colorHex]) => ({ color, colorHex }))
      .sort((a, b) => a.color.localeCompare(b.color)),
    tags: [...tagMap.entries()]
      .map(([slug, name]) => ({ slug, name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    minPrice: prices.length ? Math.min(...prices) : 0,
    maxPrice: prices.length ? Math.max(...prices) : 500000,
    categories,
  };
}

/** Resolves a page-builder product block's "source" setting into products. */
export function productsForSection(settings: Record<string, unknown>) {
  const limit = Math.min(Number(settings.limit) || 8, 24);
  const source = String(settings.source ?? "newest");

  if (source === "manual") {
    const ids = Array.isArray(settings.productIds) ? (settings.productIds as string[]) : [];
    return productsByIds(ids)
      .filter((product) => product.status === "ACTIVE")
      .slice(0, limit);
  }

  const live = liveProducts();

  switch (source) {
    case "bestsellers":
      return sortProducts(live.filter((p) => p.isBestseller), "bestselling").slice(0, limit);
    case "trending":
      return sortProducts(live.filter((p) => p.isTrending), "popular").slice(0, limit);
    case "featured":
      return sortProducts(live.filter((p) => p.isFeatured), "newest").slice(0, limit);
    case "sale":
      return sortProducts(live.filter((p) => p.isOnSale), "newest").slice(0, limit);
    case "category": {
      const categoryId = String(settings.categoryId ?? "");
      if (!categoryId) return [];
      const ids = [categoryId, ...childrenOf(categoryId).map((child) => child.id)];
      return sortProducts(
        live.filter((product) => product.categoryId && ids.includes(product.categoryId)),
        "newest",
      ).slice(0, limit);
    }
    default:
      return [...live]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit);
  }
}

/** Same category first, topped up with best sellers so a row is never half-empty. */
export function relatedProducts(product: Product, count = 4) {
  const live = liveProducts().filter((entry) => entry.id !== product.id);
  const sameCategory = live
    .filter((entry) => entry.categoryId && entry.categoryId === product.categoryId)
    .sort((a, b) => b.salesCount - a.salesCount);
  if (sameCategory.length >= count) return sameCategory.slice(0, count);

  const chosen = new Set(sameCategory.map((entry) => entry.id));
  const filler = live
    .filter((entry) => !chosen.has(entry.id))
    .sort((a, b) => b.salesCount - a.salesCount)
    .slice(0, count - sameCategory.length);

  return [...sameCategory, ...filler];
}
