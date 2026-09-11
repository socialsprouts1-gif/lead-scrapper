import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { searchProducts, getShopFacets } from "@/lib/catalog";
import { getSiteSettings } from "@/lib/settings";
import { buildMetadata, resolveSiteUrl } from "@/lib/seo";
import { getWishlistIds } from "@/app/actions/wishlist";
import { ShopFilters } from "@/components/storefront/ShopFilters";
import { ProductGridBlock } from "@/components/sections/ProductRow";

export async function generateMetadata(props: PageProps<"/shop">): Promise<Metadata> {
  const settings = await getSiteSettings();
  const siteUrl = await resolveSiteUrl(settings);
  const params = await props.searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  return buildMetadata({
    settings,
    siteUrl,
    title: q ? `Search: ${q}` : "Shop All — Hair Accessories & Handbags | Hairtie",
    description: settings.seo.description,
    path: "/shop",
    // Filtered and searched listings are kept out of the index to avoid
    // thousands of near-duplicate URLs competing with the category pages.
    noIndex: Object.keys(params).length > 0,
  });
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
function many(value: string | string[] | undefined) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export default async function ShopPage(props: PageProps<"/shop">) {
  const params = await props.searchParams;

  const filters = {
    q: first(params.q),
    category: first(params.category),
    sort: first(params.sort) ?? "newest",
    colors: many(params.color),
    tags: many(params.tag),
    maxPrice: first(params.maxPrice) ? Number(first(params.maxPrice)) : undefined,
    minPrice: first(params.minPrice) ? Number(first(params.minPrice)) : undefined,
    availability: first(params.availability) === "in-stock" ? ("in-stock" as const) : undefined,
    page: Number(first(params.page) ?? 1),
  };

  const [{ products, total, page, pageCount }, facets, wishlist] = await Promise.all([
    searchProducts(filters),
    getShopFacets(),
    getWishlistIds(),
  ]);

  const searchString = new URLSearchParams(
    Object.entries(params).flatMap(([key, value]) =>
      Array.isArray(value) ? value.map((v) => [key, v]) : value ? [[key, value]] : [],
    ) as [string, string][],
  );

  function pageHref(target: number) {
    const next = new URLSearchParams(searchString);
    next.set("page", String(target));
    return `/shop?${next.toString()}`;
  }

  return (
    <div className="ht-container py-10 md:py-14">
      <nav aria-label="Breadcrumb" className="mb-4 text-xs" style={{ color: "var(--ht-muted)" }}>
        <Link href="/" className="ht-underline">Home</Link> <span className="px-1">/</span> Shop
      </nav>

      <header className="mb-8 max-w-2xl">
        <h1 className="text-[2.1rem] md:text-[2.8rem]">{filters.q ? `“${filters.q}”` : "Shop All"}</h1>
        <p className="mt-2 text-[0.98rem]" style={{ color: "var(--ht-muted)" }}>
          {filters.q
            ? `${total} ${total === 1 ? "result" : "results"} for your search.`
            : "Hair accessories, handbags and the small things that finish a look."}
        </p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[15rem_1fr] lg:gap-12">
        <Suspense fallback={<div className="hidden lg:block" />}>
          <FilterColumn facets={facets} total={total} />
        </Suspense>

        <div>
          {products.length === 0 ? (
            <div className="ht-card px-6 py-20 text-center">
              <p className="font-serif text-2xl">Nothing matched that</p>
              <p className="mx-auto mt-2 max-w-sm text-sm" style={{ color: "var(--ht-muted)" }}>
                Try removing a filter, or browse everything we have right now.
              </p>
              <Link href="/shop" className="ht-btn ht-btn-primary mt-6">
                Browse all products
              </Link>
            </div>
          ) : (
            <ProductGridBlock products={products} columns={3} wishlist={wishlist} />
          )}

          {pageCount > 1 && (
            <nav className="mt-14 flex items-center justify-center gap-2" aria-label="Pagination">
              {page > 1 && (
                <Link href={pageHref(page - 1)} className="ht-btn ht-btn-outline ht-btn-sm">
                  Previous
                </Link>
              )}
              <span className="px-4 text-sm" style={{ color: "var(--ht-muted)" }}>
                Page {page} of {pageCount}
              </span>
              {page < pageCount && (
                <Link href={pageHref(page + 1)} className="ht-btn ht-btn-outline ht-btn-sm">
                  Next
                </Link>
              )}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}

/* ShopFilters reads the URL with useSearchParams, so it needs a Suspense boundary. */
async function FilterColumn({
  facets,
  total,
}: {
  facets: Awaited<ReturnType<typeof getShopFacets>>;
  total: number;
}) {
  return <ShopFilters facets={facets} total={total} />;
}
