import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

/* -------------------------------------------------------------------------- */
/* Site settings                                                              */
/* -------------------------------------------------------------------------- */

export type SiteSettings = {
  storeName: string;
  tagline: string;
  logoUrl: string | null;
  logoWidth: number;
  faviconUrl: string | null;
  announcement: { enabled: boolean; text: string; link: string };

  contact: {
    phone: string;
    whatsapp: string;
    email: string;
  };

  store: {
    name: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    pincode: string;
    hours: string;
    mapsUrl: string;
    mapsEmbedUrl: string;
    imageUrl: string;
  };

  social: {
    instagram: string;
    facebook: string;
    youtube: string;
    pinterest: string;
  };

  shipping: {
    flatRatePaise: number;
    freeAbovePaise: number;
    codEnabled: boolean;
    codFeePaise: number;
    onlinePaymentEnabled: boolean;
    dispatchNote: string;
  };

  seo: {
    siteTitle: string;
    titleTemplate: string;
    description: string;
    keywords: string;
    ogImageUrl: string;
    siteUrl: string;
  };

  analytics: {
    googleAnalyticsId: string;
    metaPixelId: string;
  };

  footer: {
    about: string;
    columns: { title: string; links: { label: string; href: string }[] }[];
    copyright: string;
  };

  header: {
    showSearch: boolean;
    showWishlist: boolean;
    showAccount: boolean;
    showCart: boolean;
    menu: { label: string; href: string }[];
  };
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  storeName: "Hairtie",
  tagline: "Little details. Big style.",
  logoUrl: null,
  logoWidth: 132,
  faviconUrl: null,
  announcement: {
    enabled: true,
    text: "Free shipping on orders above ₹999 · Handpicked in India",
    link: "/shop",
  },
  contact: {
    phone: "+91 98765 43210",
    whatsapp: "919876543210",
    email: "hello@hairtie.in",
  },
  store: {
    name: "Hairtie Store",
    addressLine1: "Shop 12, Ground Floor, Rosewood Arcade",
    addressLine2: "MG Road",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411001",
    hours: "Monday – Saturday · 11:00 AM to 8:30 PM\nSunday · 12:00 PM to 7:00 PM",
    mapsUrl: "https://maps.google.com/?q=MG+Road+Pune",
    mapsEmbedUrl: "",
    imageUrl: "/images/store/hairtie-store.webp",
  },
  social: {
    instagram: "https://www.instagram.com/iamhairtie",
    facebook: "",
    youtube: "",
    pinterest: "",
  },
  shipping: {
    flatRatePaise: 7900,
    freeAbovePaise: 99900,
    codEnabled: true,
    codFeePaise: 0,
    onlinePaymentEnabled: true,
    dispatchNote: "Orders are dispatched within 24–48 hours.",
  },
  seo: {
    siteTitle: "Hairtie — Hair Accessories & Handbags",
    titleTemplate: "%s | Hairtie",
    description:
      "Discover beautiful hair accessories, handbags and everyday fashion pieces from Hairtie. Claw clips, scrunchies, bows, tote bags, slings and more.",
    keywords:
      "hair accessories, handbags for women, claw clips, scrunchies, hair bows, tote bags, sling bags, clutches, hair bands",
    ogImageUrl: "",
    siteUrl: "",
  },
  analytics: {
    googleAnalyticsId: "",
    metaPixelId: "",
  },
  footer: {
    about:
      "Hairtie is a small Indian label making everyday accessories that feel a little special — hair pieces and bags chosen one by one.",
    columns: [
      {
        title: "Shop",
        links: [
          { label: "New Arrivals", href: "/shop?sort=newest" },
          { label: "Hair Accessories", href: "/categories/hair-accessories" },
          { label: "Handbags", href: "/categories/handbags" },
          { label: "All Products", href: "/shop" },
        ],
      },
      {
        title: "Help",
        links: [
          { label: "Track Order", href: "/track-order" },
          { label: "Shipping & Returns", href: "/shipping-returns" },
          { label: "FAQ", href: "/faq" },
          { label: "Contact Us", href: "/contact" },
        ],
      },
      {
        title: "About",
        links: [
          { label: "Our Story", href: "/about" },
          { label: "Visit Our Store", href: "/store" },
          { label: "Privacy Policy", href: "/privacy-policy" },
          { label: "Terms & Conditions", href: "/terms" },
        ],
      },
    ],
    copyright: "© Hairtie. All rights reserved.",
  },
  header: {
    showSearch: true,
    showWishlist: true,
    showAccount: true,
    showCart: true,
    menu: [
      { label: "Shop All", href: "/shop" },
      { label: "Hair Accessories", href: "/categories/hair-accessories" },
      { label: "Handbags", href: "/categories/handbags" },
      { label: "New In", href: "/shop?sort=newest" },
      { label: "About", href: "/about" },
      { label: "Store", href: "/store" },
    ],
  },
};

/* -------------------------------------------------------------------------- */
/* Theme settings                                                             */
/* -------------------------------------------------------------------------- */

export type ThemeSettings = {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    muted: string;
    button: string;
    buttonText: string;
    border: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
    headingWeight: string;
    baseSize: number;
    headingTracking: string;
  };
  buttons: {
    shape: "square" | "soft" | "rounded" | "pill";
    size: "sm" | "md" | "lg";
    style: "solid" | "outline";
  };
  layout: {
    contentWidth: number;
    productColumns: 2 | 3 | 4;
    sectionSpacing: "compact" | "normal" | "airy";
    radius: number;
  };
};

export const FONT_OPTIONS = [
  { id: "cormorant", label: "Cormorant Garamond (serif)", stack: "var(--font-cormorant), Georgia, serif" },
  { id: "playfair", label: "Playfair Display (serif)", stack: "var(--font-playfair), Georgia, serif" },
  { id: "fraunces", label: "Fraunces (serif)", stack: "var(--font-fraunces), Georgia, serif" },
  { id: "jost", label: "Jost (sans)", stack: "var(--font-jost), system-ui, sans-serif" },
  { id: "inter", label: "Inter (sans)", stack: "var(--font-inter), system-ui, sans-serif" },
] as const;

export function fontStack(id: string) {
  return FONT_OPTIONS.find((f) => f.id === id)?.stack ?? FONT_OPTIONS[0].stack;
}

export const DEFAULT_THEME: ThemeSettings = {
  colors: {
    primary: "#8d6a5b",
    secondary: "#f3d9d5",
    background: "#fdfaf6",
    surface: "#ffffff",
    text: "#2f2925",
    muted: "#857b73",
    button: "#3a322d",
    buttonText: "#fdfaf6",
    border: "#eae2d8",
  },
  typography: {
    headingFont: "cormorant",
    bodyFont: "jost",
    headingWeight: "500",
    baseSize: 16,
    headingTracking: "-0.01em",
  },
  buttons: { shape: "pill", size: "md", style: "solid" },
  layout: {
    contentWidth: 1280,
    productColumns: 4,
    sectionSpacing: "normal",
    radius: 16,
  },
};

/* -------------------------------------------------------------------------- */
/* Loading & saving                                                           */
/* -------------------------------------------------------------------------- */

/** Deep-merges stored JSON over the defaults so new keys never break an old row. */
function merge<T>(defaults: T, stored: unknown): T {
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return defaults;
  const out = { ...(defaults as object) } as Record<string, unknown>;
  for (const [key, value] of Object.entries(stored as Record<string, unknown>)) {
    const base = (defaults as Record<string, unknown>)[key];
    if (
      base &&
      typeof base === "object" &&
      !Array.isArray(base) &&
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      out[key] = merge(base, value);
    } else if (value !== undefined && value !== null) {
      out[key] = value;
    }
  }
  return out as T;
}

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const row = await prisma.siteSetting.findUnique({ where: { id: "singleton" } });
    return merge(DEFAULT_SITE_SETTINGS, row?.data);
  } catch {
    return DEFAULT_SITE_SETTINGS;
  }
}

export async function saveSiteSettings(patch: Partial<SiteSettings>) {
  const current = await getSiteSettings();
  const next = merge(current, patch);
  await prisma.siteSetting.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", data: next },
    update: { data: next },
  });
  return next;
}

export async function getTheme(options: { draft?: boolean } = {}): Promise<ThemeSettings> {
  try {
    const row = await prisma.themeSetting.findUnique({ where: { id: "singleton" } });
    if (options.draft && row?.draft) return merge(DEFAULT_THEME, row.draft);
    return merge(DEFAULT_THEME, row?.data);
  } catch {
    return DEFAULT_THEME;
  }
}

export async function saveTheme(patch: Partial<ThemeSettings>, mode: "draft" | "publish") {
  const base = await getTheme({ draft: mode === "draft" });
  const next = merge(base, patch);
  if (mode === "draft") {
    await prisma.themeSetting.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", data: DEFAULT_THEME, draft: next },
      update: { draft: next },
    });
  } else {
    await prisma.themeSetting.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", data: next },
      update: { data: next, draft: Prisma.DbNull },
    });
  }
  return next;
}

/** Turns theme settings into the CSS custom properties the storefront reads. */
export function themeToCssVars(theme: ThemeSettings): Record<string, string> {
  const radiusMap = { square: "0px", soft: "6px", rounded: "12px", pill: "999px" };
  const sizeMap = {
    sm: "0.55rem 1.1rem",
    md: "0.8rem 1.6rem",
    lg: "1rem 2.1rem",
  };
  const spacingMap = { compact: "3rem", normal: "4.5rem", airy: "6.5rem" };
  return {
    "--ht-primary": theme.colors.primary,
    "--ht-secondary": theme.colors.secondary,
    "--ht-bg": theme.colors.background,
    "--ht-surface": theme.colors.surface,
    "--ht-text": theme.colors.text,
    "--ht-muted": theme.colors.muted,
    "--ht-button": theme.colors.button,
    "--ht-button-text": theme.colors.buttonText,
    "--ht-border": theme.colors.border,
    "--ht-heading-font": fontStack(theme.typography.headingFont),
    "--ht-body-font": fontStack(theme.typography.bodyFont),
    "--ht-heading-weight": theme.typography.headingWeight,
    "--ht-heading-tracking": theme.typography.headingTracking,
    "--ht-base-size": `${theme.typography.baseSize}px`,
    "--ht-btn-radius": radiusMap[theme.buttons.shape],
    "--ht-btn-padding": sizeMap[theme.buttons.size],
    "--ht-radius": `${theme.layout.radius}px`,
    "--ht-content-width": `${theme.layout.contentWidth}px`,
    "--ht-section-gap": spacingMap[theme.layout.sectionSpacing],
    "--ht-product-columns": String(theme.layout.productColumns),
  };
}
