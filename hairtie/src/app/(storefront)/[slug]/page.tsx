import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedPage } from "@/lib/pages";
import { getSiteSettings } from "@/lib/settings";
import { buildMetadata, breadcrumbSchema, jsonLd, resolveSiteUrl } from "@/lib/seo";
import { getWishlistIds } from "@/app/actions/wishlist";
import { SectionList } from "@/components/sections/SectionRenderer";
import { prisma } from "@/lib/db";

/** Content pages built in the visual editor: about, faq, terms, and so on. */

export async function generateStaticParams() {
  try {
    const pages = await prisma.page.findMany({
      where: { isPublished: true, slug: { not: "home" } },
      select: { slug: true },
    });
    return pages.map((page) => ({ slug: page.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata(props: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const [settings, page] = await Promise.all([getSiteSettings(), getPublishedPage(slug)]);
  if (!page) return {};
  const siteUrl = await resolveSiteUrl(settings);
  return buildMetadata({
    settings,
    siteUrl,
    title: page.page.seoTitle || page.page.title,
    description: page.page.seoDescription,
    path: `/${slug}`,
    image: page.page.ogImageUrl,
  });
}

export default async function CmsPage(props: PageProps<"/[slug]">) {
  const { slug } = await props.params;
  const [page, settings, wishlist] = await Promise.all([
    getPublishedPage(slug),
    getSiteSettings(),
    getWishlistIds(),
  ]);
  if (!page) notFound();

  const siteUrl = await resolveSiteUrl(settings);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(
          breadcrumbSchema(siteUrl, [
            { name: "Home", path: "/" },
            { name: page.page.title, path: `/${slug}` },
          ]),
        )}
      />
      <SectionList sections={page.sections} context={{ settings, wishlist }} />
    </>
  );
}
