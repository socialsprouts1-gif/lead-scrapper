"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createId, mutate, now, store } from "@/lib/store";
import { getSectionDef, SECTION_REGISTRY } from "@/lib/sections";
import { discardPageDraft, markPageDirty, newSection, publishPage } from "@/lib/pages";
import { slugify } from "@/lib/utils";
import type { AdminResult } from "@/app/actions/admin/products";

/** Paths the storefront already uses, which a new page must not shadow. */
const RESERVED_SLUGS = [
  "shop", "cart", "checkout", "admin", "api", "products", "categories",
  "order", "wishlist", "preview", "track-order", "home",
];

function withPage<T>(pageId: string, change: (page: NonNullable<ReturnType<typeof findPage>>) => T) {
  return mutate((db) => {
    const page = db.pages.find((entry) => entry.id === pageId);
    if (!page) return null;
    const result = change(page);
    markPageDirty(page);
    return result;
  });
}

function findPage(pageId: string) {
  return store().pages.find((page) => page.id === pageId) ?? null;
}

/**
 * Replaces a page's whole draft in one go. This is what Undo/Redo posts: the
 * editor keeps snapshots of the section list, so a single action can put back
 * an order, a deleted section and a half-typed heading together.
 */
export async function replacePageSections(
  pageId: string,
  sections: { id: string; type: string; isHidden: boolean; settings: Record<string, unknown> }[],
): Promise<AdminResult> {
  if (!Array.isArray(sections)) return { ok: false, message: "Could not read that change." };
  if (sections.some((section) => !getSectionDef(section.type))) {
    return { ok: false, message: "That change refers to a section type that no longer exists." };
  }

  const ok = withPage(pageId, (page) => {
    page.sections = sections.map((section, index) => ({
      id: section.id,
      type: section.type,
      position: index,
      isHidden: Boolean(section.isHidden),
      settings: (section.settings ?? {}) as Record<string, unknown>,
    }));
    return true;
  });

  return ok ? { ok: true, message: "Done." } : { ok: false, message: "That page no longer exists." };
}

export async function publishPageChanges(slug: string): Promise<AdminResult> {
  const page = publishPage(slug);
  if (!page) return { ok: false, message: "That page no longer exists." };
  revalidatePath("/", "layout");
  return { ok: true, message: "Published — your changes are live." };
}

export async function discardPageChanges(slug: string): Promise<AdminResult> {
  const result = discardPageDraft(slug);
  if (!result.ok) return { ok: false, message: result.reason };
  return { ok: true, message: "Unpublished changes discarded." };
}

const pageMetaSchema = z.object({
  title: z.string().trim().min(1).max(120),
  seoTitle: z.string().trim().max(160).optional().or(z.literal("")),
  seoDescription: z.string().trim().max(320).optional().or(z.literal("")),
  ogImageUrl: z.string().trim().max(500).optional().or(z.literal("")),
  isPublished: z.boolean().optional(),
});

export async function updatePageMeta(pageId: string, input: unknown): Promise<AdminResult> {
  const parsed = pageMetaSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Please check the page details." };
  const data = parsed.data;

  mutate((db) => {
    const page = db.pages.find((entry) => entry.id === pageId);
    if (!page) return;
    page.title = data.title;
    page.seoTitle = data.seoTitle || null;
    page.seoDescription = data.seoDescription || null;
    page.ogImageUrl = data.ogImageUrl || null;
    if (data.isPublished !== undefined) page.isPublished = data.isPublished;
    page.updatedAt = now();
  });

  revalidatePath("/", "layout");
  return { ok: true, message: "Page details saved." };
}

export async function createPage(title: string): Promise<AdminResult<{ slug: string }>> {
  const clean = title.trim();
  if (clean.length < 2) return { ok: false, message: "Please give the page a name." };

  const root = slugify(clean) || "page";
  if (RESERVED_SLUGS.includes(root)) {
    return { ok: false, message: `"${root}" is used by the shop itself. Please pick another name.` };
  }

  let slug = root;
  let n = 2;
  while (store().pages.some((page) => page.slug === slug)) {
    slug = `${root}-${n}`;
    n += 1;
  }

  const template = SECTION_REGISTRY.find((entry) => entry.type === "textSection")!;

  mutate((db) => {
    db.pages.push({
      id: createId("pg"),
      slug,
      title: clean,
      isSystem: false,
      isPublished: false,
      seoTitle: clean,
      seoDescription: null,
      ogImageUrl: null,
      sections: [
        newSection("textSection", 0, {
          ...template.defaults,
          heading: clean,
          body: "Write something here.",
        }),
      ],
      publishedSnapshot: null,
      hasDraftChanges: true,
      updatedAt: now(),
    });
  });

  revalidatePath("/admin/editor");
  return { ok: true, message: "Page created.", data: { slug } };
}

export async function deletePage(pageId: string): Promise<AdminResult> {
  const page = findPage(pageId);
  if (!page) return { ok: false, message: "That page no longer exists." };
  if (page.isSystem) {
    return { ok: false, message: "This is a built-in page and cannot be deleted. You can unpublish it instead." };
  }

  mutate((db) => {
    db.pages = db.pages.filter((entry) => entry.id !== pageId);
  });

  revalidatePath("/", "layout");
  return { ok: true, message: "Page deleted." };
}
