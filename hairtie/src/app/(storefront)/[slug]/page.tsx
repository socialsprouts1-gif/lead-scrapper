import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { allPages, getPublishedPage } from "@/lib/pages";
import { getSiteSettings } from "@/lib/settings";
import { buildMetadata, breadcrumbSchema, jsonLd, resolveSiteUrl } from "@/lib/seo";
import { getWishlistIds } from "@/lib/wishlist";
import { SectionList } from "@/components/sections/SectionRenderer";

/** Content pages built in the visual editor: about, faq, terms, and so on. */

export function generateStaticParams() {
  return allPages()
    .filter((page) => page.isPublished && page.slug !== "home")
    .map((page) => ({ slug: page.slug }));
}

export async function generateMetadata(props: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const settings = getSiteSettings();
  const page = getPublishedPage(slug);
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
  const page = getPublishedPage(slug);
  const settings = getSiteSettings();
  const wishlist = await getWishlistIds();
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
