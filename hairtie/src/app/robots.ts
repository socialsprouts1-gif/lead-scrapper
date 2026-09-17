import type { MetadataRoute } from "next";
import { getSiteSettings } from "@/lib/settings";
import { resolveSiteUrl } from "@/lib/seo";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = getSiteSettings();
  const base = await resolveSiteUrl(settings);

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private and transactional pages carry nothing worth indexing.
        disallow: ["/admin", "/api", "/preview", "/cart", "/checkout", "/order/", "/wishlist"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
