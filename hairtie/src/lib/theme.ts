/**
 * Theme tokens — safe to import from client components (no database access).
 * The values are stored in the ThemeSetting table and edited in Admin →
 * Appearance; this module only knows their shape and defaults.
 */

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
  return FONT_OPTIONS.find((font) => font.id === id)?.stack ?? FONT_OPTIONS[0].stack;
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
