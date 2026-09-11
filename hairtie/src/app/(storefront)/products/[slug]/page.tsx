import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { prisma } from "@/lib/db";
import { PRODUCT_CARD_SELECT, averageRating } from "@/lib/catalog";
import { getSiteSettings } from "@/lib/settings";
import { buildMetadata, breadcrumbSchema, jsonLd, resolveSiteUrl } from "@/lib/seo";
import { paiseToRupees, formatPaise } from "@/lib/money";
import { productInquiryMessage, whatsappLink } from "@/lib/whatsapp";
import { getWishlistIds } from "@/app/actions/wishlist";
import { formatDate } from "@/lib/utils";
import { ProductGallery } from "@/components/storefront/ProductGallery";
import { ProductPurchase } from "@/components/storefront/ProductPurchase";
import { ReviewForm } from "@/components/storefront/ReviewForm";
import { RecentlyViewed } from "@/components/storefront/RecentlyViewed";
import { ProductGridBlock } from "@/components/sections/ProductRow";
import { Stars } from "@/components/ui/Stars";

async function loadProduct(slug: string) {
  return prisma.product.findFirst({
    where: { slug, status: { not: "DRAFT" } },
    include: {
      images: { orderBy: { position: "asc" } },
      variants: { where: { isActive: true }, orderBy: { position: "asc" } },
      attributes: { orderBy: { position: "asc" } },
      category: { select: { name: true, slug: true, parent: { select: { name: true, slug: true } } } },
      tags: { include: { tag: true } },
      reviews: { where: { status: "APPROVED" }, orderBy: { createdAt: "desc" }, take: 12 },
    },
  });
}

export async function generateMetadata(props: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const [product, settings] = await Promise.all([loadProduct(slug), getSiteSettings()]);
  if (!product) return {};
  const siteUrl = await resolveSiteUrl(settings);
  return buildMetadata({
    settings,
    siteUrl,
    title: product.seoTitle || `${product.name} | ${settings.storeName}`,
    description: product.seoDescription || product.shortDescription || product.description.slice(0, 160),
    keywords: product.seoKeywords,
    path: `/products/${product.slug}`,
    canonical: product.canonicalUrl,
    image: product.ogImageUrl || product.images[0]?.url,
    type: "article",
    noIndex: product.status === "ARCHIVED",
  });
}

export default async function ProductPage(props: PageProps<"/products/[slug]">) {
  const { slug } = await props.params;
  const [product, settings, wishlist] = await Promise.all([
    loadProduct(slug),
    getSiteSettings(),
    getWishlistIds(),
  ]);
  if (!product || product.status === "ARCHIVED") notFound();

  const siteUrl = await resolveSiteUrl(settings);
  const url = `${siteUrl}/products/${product.slug}`;

  // Fire-and-forget view counter — never blocks the render.
  prisma.product
    .update({ where: { id: product.id }, data: { viewCount: { increment: 1 } } })
    .catch(() => {});

  // Related products: same category first, topped up with best sellers so the
  // row is never left with an awkward gap.
  const sameCategory = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      id: { not: product.id },
      ...(product.categoryId ? { categoryId: product.categoryId } : {}),
    },
    select: PRODUCT_CARD_SELECT,
    orderBy: { salesCount: "desc" },
    take: 4,
  });

  const related =
    sameCategory.length >= 4
      ? sameCategory
      : [
          ...sameCategory,
          ...(await prisma.product.findMany({
            where: {
              status: "ACTIVE",
              id: { notIn: [product.id, ...sameCategory.map((item) => item.id)] },
            },
            select: PRODUCT_CARD_SELECT,
            orderBy: { salesCount: "desc" },
            take: 4 - sameCategory.length,
          })),
        ];

  const rating = averageRating(product);
  const totalStock = product.variants.length
    ? product.variants.reduce((sum, v) => sum + v.stock, 0)
    : product.stock;
  const inStock = !product.trackInventory || totalStock > 0;

  const specGroups = product.attributes.reduce<Record<string, typeof product.attributes>>((acc, attribute) => {
    (acc[attribute.group] ||= []).push(attribute);
    return acc;
  }, {});

  const trail = [
    { name: "Home", path: "/" },
    { name: "Shop", path: "/shop" },
    ...(product.category?.parent
      ? [{ name: product.category.parent.name, path: `/categories/${product.category.parent.slug}` }]
      : []),
    ...(product.category ? [{ name: product.category.name, path: `/categories/${product.category.slug}` }] : []),
    { name: product.name, path: `/products/${product.slug}` },
  ];

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription || product.description.slice(0, 300),
    sku: product.sku,
    brand: { "@type": "Brand", name: product.brand },
    image: product.images.map((image) => `${siteUrl}${image.url}`),
    ...(product.material ? { material: product.material } : {}),
    ...(product.weightGrams
      ? { weight: { "@type": "QuantitativeValue", value: product.weightGrams, unitCode: "GRM" } }
      : {}),
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "INR",
      price: paiseToRupees(product.price),
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: settings.storeName },
    },
    ...(product.reviewCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: rating,
            reviewCount: product.reviewCount,
          },
        }
      : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(productSchema)} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(breadcrumbSchema(siteUrl, trail))}
      />

      <div className="ht-container pb-24 pt-6 md:pb-10 md:pt-10">
        <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-1 text-xs" style={{ color: "var(--ht-muted)" }}>
          {trail.slice(0, -1).map((crumb) => (
            <span key={crumb.path} className="flex items-center gap-1">
              <Link href={crumb.path} className="ht-underline">
                {crumb.name}
              </Link>
              <span>/</span>
            </span>
          ))}
          <span aria-current="page">{product.name}</span>
        </nav>

        <div className="grid min-w-0 gap-8 lg:grid-cols-2 lg:gap-14">
          <ProductGallery
            images={product.images.map((image) => ({ url: image.url, alt: image.alt }))}
            name={product.name}
          />

          <div>
            {product.category && (
              <Link href={`/categories/${product.category.slug}`} className="ht-eyebrow ht-underline">
                {product.category.name}
              </Link>
            )}
            <h1 className="mt-2 text-[2rem] leading-tight md:text-[2.6rem]">{product.name}</h1>

            {product.reviewCount > 0 && (
              <a href="#reviews" className="mt-2 inline-flex items-center gap-2 text-sm">
                <Stars rating={rating} />
                <span style={{ color: "var(--ht-muted)" }}>
                  {rating} · {product.reviewCount} {product.reviewCount === 1 ? "review" : "reviews"}
                </span>
              </a>
            )}

            {product.shortDescription && (
              <p className="mt-4 text-[1rem] leading-relaxed" style={{ color: "var(--ht-muted)" }}>
                {product.shortDescription}
              </p>
            )}

            <div className="mt-7">
              <ProductPurchase
                productId={product.id}
                productName={product.name}
                basePrice={product.price}
                baseMrp={product.mrp}
                baseStock={product.stock}
                trackInventory={product.trackInventory}
                lowStockThreshold={product.lowStockThreshold}
                variants={product.variants.map((variant) => ({
                  id: variant.id,
                  name: variant.name,
                  color: variant.color,
                  colorHex: variant.colorHex,
                  size: variant.size,
                  price: variant.price,
                  mrp: variant.mrp,
                  stock: variant.stock,
                }))}
                wishlisted={wishlist.includes(product.id)}
                whatsappHref={whatsappLink(
                  settings.contact.whatsapp,
                  productInquiryMessage(product.name, url),
                )}
              />
            </div>

            <div className="mt-9 divide-y" style={{ borderColor: "var(--ht-border)" }}>
              <Accordion title="Description" defaultOpen>
                <div className="ht-prose text-[0.95rem] leading-relaxed" style={{ color: "var(--ht-muted)" }}>
                  {product.description.split(/\n{2,}/).map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>
              </Accordion>

              {Object.keys(specGroups).length > 0 && (
                <Accordion title="Details & specifications">
                  <div className="space-y-6">
                    {Object.entries(specGroups).map(([group, attributes]) => (
                      <div key={group}>
                        {Object.keys(specGroups).length > 1 && <p className="ht-eyebrow mb-2">{group}</p>}
                        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                          {attributes.map((attribute) => (
                            <div key={attribute.id} className="flex justify-between gap-4 text-sm sm:block">
                              <dt style={{ color: "var(--ht-muted)" }}>{attribute.name}</dt>
                              <dd className="text-right sm:text-left">{attribute.value}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    ))}
                    <dl className="grid gap-x-6 gap-y-2 border-t pt-4 text-sm sm:grid-cols-2" style={{ borderColor: "var(--ht-border)" }}>
                      <div className="flex justify-between gap-4 sm:block">
                        <dt style={{ color: "var(--ht-muted)" }}>SKU</dt>
                        <dd>{product.sku}</dd>
                      </div>
                      {product.weightGrams && (
                        <div className="flex justify-between gap-4 sm:block">
                          <dt style={{ color: "var(--ht-muted)" }}>Weight</dt>
                          <dd>{product.weightGrams} g</dd>
                        </div>
                      )}
                      <div className="flex justify-between gap-4 sm:block">
                        <dt style={{ color: "var(--ht-muted)" }}>Country of origin</dt>
                        <dd>{product.countryOfOrigin}</dd>
                      </div>
                    </dl>
                  </div>
                </Accordion>
              )}

              {product.careInstructions && (
                <Accordion title="Care">
                  <p className="text-[0.95rem] leading-relaxed" style={{ color: "var(--ht-muted)" }}>
                    {product.careInstructions}
                  </p>
                </Accordion>
              )}

              <Accordion title="Shipping & returns">
                <ul className="space-y-2 text-[0.95rem]" style={{ color: "var(--ht-muted)" }}>
                  <li>{settings.shipping.dispatchNote}</li>
                  <li>
                    Free shipping on orders above {formatPaise(settings.shipping.freeAbovePaise)}; a flat{" "}
                    {formatPaise(settings.shipping.flatRatePaise)} below that.
                  </li>
                  {settings.shipping.codEnabled && <li>Cash on Delivery available on most pincodes.</li>}
                  <li>
                    Returns accepted within 7 days —{" "}
                    <Link href="/shipping-returns" className="ht-underline">read the policy</Link>.
                  </li>
                </ul>
              </Accordion>
            </div>

            {product.tags.length > 0 && (
              <div className="mt-7 flex flex-wrap gap-2">
                {product.tags.map(({ tag }) => (
                  <Link
                    key={tag.id}
                    href={`/shop?tag=${tag.slug}`}
                    className="rounded-full px-3 py-1.5 text-xs"
                    style={{ border: "1px solid var(--ht-border)", color: "var(--ht-muted)" }}
                  >
                    {tag.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <section id="reviews" className="ht-section" style={{ background: "var(--ht-surface)" }}>
        <div className="ht-container">
          <div className="grid gap-10 lg:grid-cols-[20rem_1fr] lg:gap-16">
            <div>
              <h2 className="text-[1.6rem] md:text-[2.1rem]">Customer reviews</h2>
              {product.reviewCount > 0 ? (
                <div className="mt-3">
                  <div className="flex items-baseline gap-2">
                    <span className="font-serif text-4xl">{rating}</span>
                    <span className="text-sm" style={{ color: "var(--ht-muted)" }}>out of 5</span>
                  </div>
                  <Stars rating={rating} size={16} className="mt-1" />
                  <p className="mt-1 text-sm" style={{ color: "var(--ht-muted)" }}>
                    Based on {product.reviewCount} {product.reviewCount === 1 ? "review" : "reviews"}
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-sm" style={{ color: "var(--ht-muted)" }}>
                  No reviews yet — be the first to write one.
                </p>
              )}
              <div className="mt-6">
                <ReviewForm productId={product.id} />
              </div>
            </div>

            <div className="space-y-6">
              {product.reviews.map((review) => (
                <article key={review.id} className="border-b pb-6 last:border-0" style={{ borderColor: "var(--ht-border)" }}>
                  <Stars rating={review.rating} />
                  {review.title && <h3 className="mt-2 text-lg">{review.title}</h3>}
                  <p className="mt-2 text-[0.95rem] leading-relaxed" style={{ color: "var(--ht-muted)" }}>
                    {review.body}
                  </p>
                  <p className="mt-3 text-xs" style={{ color: "var(--ht-muted)" }}>
                    {review.authorName}
                    {review.isVerified && " · Verified buyer"} · {formatDate(review.createdAt)}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="ht-section">
          <div className="ht-container">
            <h2 className="mb-8 text-[1.6rem] md:text-[2.1rem]">You may also like</h2>
            <ProductGridBlock products={related} columns={4} wishlist={wishlist} />
          </div>
        </section>
      )}

      <RecentlyViewed
        current={{
          slug: product.slug,
          name: product.name,
          price: product.price,
          image: product.images[0]?.url ?? null,
        }}
      />
    </>
  );
}

function Accordion({
  title,
  children,
  defaultOpen,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="group py-4" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between text-[0.98rem] font-medium">
        {title}
        <ChevronDown size={17} strokeWidth={1.5} className="transition group-open:rotate-180" />
      </summary>
      <div className="pt-4">{children}</div>
    </details>
  );
}
