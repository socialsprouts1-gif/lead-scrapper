"use server";

import { revalidatePath } from "next/cache";
import { discardTheme, saveSiteSettings, saveTheme } from "@/lib/settings";
import type { SiteSettings } from "@/lib/site-settings";
import type { ThemeSettings } from "@/lib/theme";
import type { AdminResult } from "@/app/actions/admin/products";

export async function updateSiteSettings(patch: Partial<SiteSettings>): Promise<AdminResult> {
  saveSiteSettings(patch);
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved. Your shop has been updated." };
}

export async function updateTheme(
  patch: Partial<ThemeSettings>,
  mode: "draft" | "publish",
): Promise<AdminResult> {
  saveTheme(patch, mode);
  if (mode === "publish") revalidatePath("/", "layout");
  return {
    ok: true,
    message: mode === "publish" ? "Your new look is live." : "Draft saved.",
  };
}

export async function discardThemeDraft(): Promise<AdminResult> {
  discardTheme();
  return { ok: true, message: "Unpublished changes discarded." };
}
