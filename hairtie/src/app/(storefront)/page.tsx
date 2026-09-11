import type { Metadata } from "next";
import { getPublishedPage } from "@/lib/pages";
import { getSiteSettings } from "@/lib/settings";
import { buildMetadata, resolveSiteUrl } from "@/lib/seo";
import { getWishlistIds } from "@/lib/wishlist";
import { SectionList } from "@/components/sections/SectionRenderer";

export async function generateMetadata(): Promise<Metadata> {
  const settings = getSiteSettings();
  const page = getPublishedPage("home");
  const siteUrl = await resolveSiteUrl(settings);
  return buildMetadata({
    settings,
    siteUrl,
    title: page?.page.seoTitle || settings.seo.siteTitle,
    description: page?.page.seoDescription,
    path: "/",
    image: page?.page.ogImageUrl,
  });
}

export default async function HomePage() {
  const home = getPublishedPage("home");
  const settings = getSiteSettings();
  const wishlist = await getWishlistIds();

  if (!home) {
    return (
      <div className="ht-container ht-section text-center">
        <h1 className="text-3xl">Welcome to {settings.storeName}</h1>
        <p className="mt-3" style={{ color: "var(--ht-muted)" }}>
          Your homepage has not been set up yet. Open the admin panel and go to{" "}
          <strong>Website Editor</strong> to build it.
        </p>
      </div>
    );
  }

  return <SectionList sections={home.sections} context={{ settings, wishlist }} />;
}
