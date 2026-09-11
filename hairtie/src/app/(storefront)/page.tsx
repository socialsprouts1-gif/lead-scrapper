import type { Metadata } from "next";
import { getPublishedPage } from "@/lib/pages";
import { getSiteSettings } from "@/lib/settings";
import { buildMetadata, resolveSiteUrl } from "@/lib/seo";
import { getWishlistIds } from "@/app/actions/wishlist";
import { SectionList } from "@/components/sections/SectionRenderer";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const [siteUrl, page] = await Promise.all([resolveSiteUrl(settings), getPublishedPage("home")]);
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
  const [home, settings, wishlist] = await Promise.all([
    getPublishedPage("home"),
    getSiteSettings(),
    getWishlistIds(),
  ]);

  if (!home) {
    return (
      <div className="ht-container ht-section text-center">
        <h1 className="text-3xl">Welcome to {settings.storeName}</h1>
        <p className="mt-3" style={{ color: "var(--ht-muted)" }}>
          Your homepage has not been set up yet. Sign in to the admin panel and open{" "}
          <strong>Website Editor</strong> to build it.
        </p>
      </div>
    );
  }

  return <SectionList sections={home.sections} context={{ settings, wishlist }} />;
}
