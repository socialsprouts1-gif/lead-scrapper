import type { Metadata } from "next";
import { headers } from "next/headers";
import type { SiteSettings } from "@/lib/settings";

/**
 * Resolves the public site URL. Prefers the value set in Store Settings, then
 * NEXT_PUBLIC_SITE_URL, then the incoming request's host — so canonical URLs
 * and sitemaps are correct on any host without extra configuration.
 */
export async function resolveSiteUrl(settings?: SiteSettings) {
  const configured = settings?.seo.siteUrl || process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  try {
    const list = await headers();
    const host = list.get("x-forwarded-host") ?? list.get("host");
    const proto = list.get("x-forwarded-proto") ?? "https";
    if (host) return `${proto}://${host}`;
  } catch {
    // headers() is unavailable outside a request — fall through.
  }
  return "http://localhost:3000";
}

export function buildMetadata(input: {
  settings: SiteSettings;
  siteUrl: string;
  title?: string | null;
  description?: string | null;
  path?: string;
  image?: string | null;
  keywords?: string | null;
  canonical?: string | null;
  noIndex?: boolean;
  type?: "website" | "article";
}): Metadata {
  const { settings, siteUrl } = input;
  const title = input.title?.trim() || settings.seo.siteTitle;
  const description = input.description?.trim() || settings.seo.description;
  const path = input.path ?? "/";
  const canonical = input.canonical || `${siteUrl}${path}`;
  const image = input.image || settings.seo.ogImageUrl || "/images/hero/hero-main.webp";
  const absoluteImage = image.startsWith("http") ? image : `${siteUrl}${image}`;

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    keywords: input.keywords || settings.seo.keywords,
    alternates: { canonical },
    robots: input.noIndex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: settings.storeName,
      type: input.type ?? "website",
      locale: "en_IN",
      images: [{ url: absoluteImage, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [absoluteImage],
    },
  };
}

export function jsonLd(data: Record<string, unknown>) {
  return {
    __html: JSON.stringify(data).replace(/</g, "\\u003c"),
  };
}

export function breadcrumbSchema(siteUrl: string, trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${siteUrl}${crumb.path}`,
    })),
  };
}

export function organizationSchema(settings: SiteSettings, siteUrl: string) {
  const socials = Object.values(settings.social).filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": "Store",
    name: settings.storeName,
    description: settings.seo.description,
    url: siteUrl,
    telephone: settings.contact.phone,
    email: settings.contact.email,
    image: `${siteUrl}${settings.store.imageUrl || "/images/store/hairtie-store.webp"}`,
    address: {
      "@type": "PostalAddress",
      streetAddress: [settings.store.addressLine1, settings.store.addressLine2].filter(Boolean).join(", "),
      addressLocality: settings.store.city,
      addressRegion: settings.store.state,
      postalCode: settings.store.pincode,
      addressCountry: "IN",
    },
    ...(socials.length ? { sameAs: socials } : {}),
  };
}
