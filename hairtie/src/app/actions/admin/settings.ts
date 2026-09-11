"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getAdminOrNull } from "@/lib/auth";
import { saveSiteSettings, saveTheme, type SiteSettings, type ThemeSettings } from "@/lib/settings";
import type { AdminResult } from "@/app/actions/admin/products";

async function guard() {
  const admin = await getAdminOrNull();
  if (!admin) throw new Error("Not authorised.");
  return admin;
}

export async function updateSiteSettings(patch: Partial<SiteSettings>): Promise<AdminResult> {
  await guard();
  await saveSiteSettings(patch);
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved. Your shop has been updated." };
}

export async function updateTheme(
  patch: Partial<ThemeSettings>,
  mode: "draft" | "publish",
): Promise<AdminResult> {
  await guard();
  await saveTheme(patch, mode);
  if (mode === "publish") revalidatePath("/", "layout");
  return {
    ok: true,
    message: mode === "publish" ? "Your new look is live." : "Draft saved.",
  };
}

export async function discardThemeDraft(): Promise<AdminResult> {
  await guard();
  const row = await prisma.themeSetting.findUnique({ where: { id: "singleton" } });
  if (row?.draft) {
    await prisma.themeSetting.update({
      where: { id: "singleton" },
      data: { draft: undefined },
    });
  }
  return { ok: true, message: "Unpublished changes discarded." };
}
