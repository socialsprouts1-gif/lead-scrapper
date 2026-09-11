import type { MetadataRoute } from "next";
import { allCategories, liveProducts } from "@/lib/catalog";
import { allPages } from "@/lib/pages";
import { getSiteSettings } from "@/lib/settings";
import { resolveSiteUrl } from "@/lib/seo";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const settings = getSiteSettings();
  const base = await resolveSiteUrl(settings);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/shop`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/categories`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/track-order`, changeFrequency: "yearly", priority: 0.3 },
  ];

  const products = liveProducts();
  const categories = allCategories().filter((category) => category.isActive);
  const pages = allPages().filter((page) => page.isPublished && page.slug !== "home");

  return [
    ...staticRoutes,
    ...categories.map((category) => ({
      url: `${base}/categories/${category.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...products.map((product) => ({
      url: `${base}/products/${product.slug}`,
      lastModified: new Date(product.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...pages.map((page) => ({
      url: `${base}/${page.slug}`,
      lastModified: new Date(page.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
