import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { getShopFacets, searchProducts } from "@/lib/catalog";
import { getSiteSettings } from "@/lib/settings";
import { buildMetadata, breadcrumbSchema, jsonLd, resolveSiteUrl } from "@/lib/seo";
import { getWishlistIds } from "@/app/actions/wishlist";
import { ShopFilters } from "@/components/storefront/ShopFilters";
import { ProductGridBlock } from "@/components/sections/ProductRow";

export async function generateStaticParams() {
  try {
    const categories = await prisma.category.findMany({ where: { isActive: true }, select: { slug: true } });
    return categories.map((category) => ({ slug: category.slug }));
  } catch {
    return [];
  }
}

async function loadCategory(slug: string) {
  return prisma.category.findUnique({
    where: { slug },
    include: {
      parent: { select: { name: true, slug: true } },
      children: { where: { isActive: true }, orderBy: [{ position: "asc" }], select: { name: true, slug: true } },
    },
  });
}

export async function generateMetadata(props: PageProps<"/categories/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const [category, settings] = await Promise.all([loadCategory(slug), getSiteSettings()]);
  if (!category) return {};
  const siteUrl = await resolveSiteUrl(settings);
  return buildMetadata({
    settings,
    siteUrl,
    title: category.seoTitle || `${category.name} | ${settings.storeName}`,
    description: category.seoDescription || category.description,
    path: `/categories/${category.slug}`,
    image: category.imageUrl,
  });
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
function many(value: string | string[] | undefined) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export default async function CategoryPage(props: PageProps<"/categories/[slug]">) {
  const { slug } = await props.params;
  const params = await props.searchParams;
  const [category, settings] = await Promise.all([loadCategory(slug), getSiteSettings()]);
  if (!category || !category.isActive) notFound();

  const page = Number(first(params.page) ?? 1);
  const [{ products, total, pageCount }, facets, wishlist, siteUrl] = await Promise.all([
    searchProducts({
      category: slug,
      sort: first(params.sort) ?? "newest",
      colors: many(params.color),
      tags: many(params.tag),
      maxPrice: first(params.maxPrice) ? Number(first(params.maxPrice)) : undefined,
      availability: first(params.availability) === "in-stock" ? ("in-stock" as const) : undefined,
      page,
    }),
    getShopFacets(),
    getWishlistIds(),
    resolveSiteUrl(settings),
  ]);

  const trail = [
    { name: "Home", path: "/" },
    ...(category.parent ? [{ name: category.parent.name, path: `/categories/${category.parent.slug}` }] : []),
    { name: category.name, path: `/categories/${category.slug}` },
  ];

  function pageHref(target: number) {
    const next = new URLSearchParams(
      Object.entries(params).flatMap(([key, value]) =>
        Array.isArray(value) ? value.map((v) => [key, v]) : value ? [[key, value]] : [],
      ) as [string, string][],
    );
    next.set("page", String(target));
    return `/categories/${slug}?${next.toString()}`;
  }

  return (
    <div className="ht-container py-10 md:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(breadcrumbSchema(siteUrl, trail))} />

      <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-xs" style={{ color: "var(--ht-muted)" }}>
        {trail.slice(0, -1).map((crumb) => (
          <span key={crumb.path} className="flex items-center gap-1">
            <Link href={crumb.path} className="ht-underline">{crumb.name}</Link>
            <span>/</span>
          </span>
        ))}
        <span aria-current="page">{category.name}</span>
      </nav>

      <header className="mb-8 max-w-2xl">
        <h1 className="text-[2.1rem] md:text-[2.8rem]">{category.name}</h1>
        {category.description && (
          <p className="mt-2 text-[0.98rem]" style={{ color: "var(--ht-muted)" }}>
            {category.description}
          </p>
        )}
      </header>

      {category.children.length > 0 && (
        <div className="ht-scroll-x mb-8 -mx-5 px-5 md:mx-0 md:flex-wrap md:px-0">
          {category.children.map((child) => (
            <Link
              key={child.slug}
              href={`/categories/${child.slug}`}
              className="rounded-full px-4 py-2 text-sm transition hover:opacity-70"
              style={{ border: "1px solid var(--ht-border)", background: "var(--ht-surface)" }}
            >
              {child.name}
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-10 lg:grid-cols-[15rem_1fr] lg:gap-12">
        <Suspense fallback={<div className="hidden lg:block" />}>
          <ShopFilters facets={facets} total={total} lockedCategory={slug} />
        </Suspense>

        <div>
          {products.length === 0 ? (
            <div className="ht-card px-6 py-20 text-center">
              <p className="font-serif text-2xl">Nothing here just yet</p>
              <p className="mx-auto mt-2 max-w-sm text-sm" style={{ color: "var(--ht-muted)" }}>
                Try clearing your filters, or have a look at everything in the shop.
              </p>
              <Link href="/shop" className="ht-btn ht-btn-primary mt-6">Browse all products</Link>
            </div>
          ) : (
            <ProductGridBlock products={products} columns={3} wishlist={wishlist} />
          )}

          {pageCount > 1 && (
            <nav className="mt-14 flex items-center justify-center gap-2" aria-label="Pagination">
              {page > 1 && <Link href={pageHref(page - 1)} className="ht-btn ht-btn-outline ht-btn-sm">Previous</Link>}
              <span className="px-4 text-sm" style={{ color: "var(--ht-muted)" }}>Page {page} of {pageCount}</span>
              {page < pageCount && <Link href={pageHref(page + 1)} className="ht-btn ht-btn-outline ht-btn-sm">Next</Link>}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
