import "server-only";
import { mutate, store } from "@/lib/store";
import { DEFAULT_SITE_SETTINGS, type SiteSettings } from "@/lib/site-settings";
import { DEFAULT_THEME, type ThemeSettings } from "@/lib/theme";

export {
  DEFAULT_SITE_SETTINGS,
  type SiteSettings,
} from "@/lib/site-settings";

export {
  DEFAULT_THEME,
  FONT_OPTIONS,
  fontStack,
  themeToCssVars,
  type ThemeSettings,
} from "@/lib/theme";

/** Deep-merges a patch over the current values so a partial save is safe. */
function merge<T>(base: T, patch: unknown): T {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) return base;
  const out = { ...(base as object) } as Record<string, unknown>;
  for (const [key, value] of Object.entries(patch as Record<string, unknown>)) {
    const current = (base as Record<string, unknown>)[key];
    if (
      current &&
      typeof current === "object" &&
      !Array.isArray(current) &&
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      out[key] = merge(current, value);
    } else if (value !== undefined && value !== null) {
      out[key] = value;
    }
  }
  return out as T;
}

export function getSiteSettings(): SiteSettings {
  return merge(DEFAULT_SITE_SETTINGS, store().settings);
}

export function saveSiteSettings(patch: Partial<SiteSettings>) {
  return mutate((data) => {
    data.settings = merge(getSiteSettings(), patch);
    return data.settings;
  });
}

export function getTheme(options: { draft?: boolean } = {}): ThemeSettings {
  const theme = store().theme;
  if (options.draft && theme.draft) return merge(DEFAULT_THEME, theme.draft);
  return merge(DEFAULT_THEME, theme.published);
}

export function saveTheme(patch: Partial<ThemeSettings>, mode: "draft" | "publish") {
  return mutate((data) => {
    const base = getTheme({ draft: mode === "draft" });
    const next = merge(base, patch);
    if (mode === "draft") {
      data.theme.draft = next;
    } else {
      data.theme.published = next;
      data.theme.draft = null;
    }
    return next;
  });
}

export function hasThemeDraft() {
  return Boolean(store().theme.draft);
}

export function discardTheme() {
  mutate((data) => {
    data.theme.draft = null;
  });
}
