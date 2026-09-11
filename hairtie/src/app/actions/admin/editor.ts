"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createId, mutate, now, store } from "@/lib/store";
import { getSectionDef, SECTION_REGISTRY } from "@/lib/sections";
import { discardPageDraft, markPageDirty, newSection, publishPage, renumber } from "@/lib/pages";
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

export async function addSection(
  pageId: string,
  type: string,
  afterPosition?: number,
): Promise<AdminResult<{ id: string }>> {
  const def = getSectionDef(type);
  if (!def) return { ok: false, message: "Unknown section type." };

  const id = createId("sec");
  const created = withPage(pageId, (page) => {
    const insertAt = afterPosition === undefined ? page.sections.length : afterPosition + 1;
    const section = newSection(type, insertAt, { ...def.defaults });
    section.id = id;
    for (const entry of page.sections) {
      if (entry.position >= insertAt) entry.position += 1;
    }
    page.sections.push(section);
    renumber(page.sections);
    return true;
  });

  if (!created) return { ok: false, message: "That page no longer exists." };
  return { ok: true, message: `${def.label} added.`, data: { id } };
}

export async function updateSection(sectionId: string, settings: unknown): Promise<AdminResult> {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return { ok: false, message: "Could not read those settings." };
  }

  const ok = mutate((db) => {
    for (const page of db.pages) {
      const section = page.sections.find((entry) => entry.id === sectionId);
      if (section) {
        section.settings = settings as Record<string, unknown>;
        markPageDirty(page);
        return true;
      }
    }
    return false;
  });

  return ok ? { ok: true, message: "Saved." } : { ok: false, message: "That section no longer exists." };
}

export async function reorderSections(pageId: string, orderedIds: string[]): Promise<AdminResult> {
  const ok = withPage(pageId, (page) => {
    orderedIds.forEach((id, index) => {
      const section = page.sections.find((entry) => entry.id === id);
      if (section) section.position = index;
    });
    renumber(page.sections);
    return true;
  });
  return ok ? { ok: true, message: "Order saved." } : { ok: false, message: "That page no longer exists." };
}

export async function moveSection(sectionId: string, direction: "up" | "down"): Promise<AdminResult> {
  const ok = mutate((db) => {
    for (const page of db.pages) {
      const sorted = [...page.sections].sort((a, b) => a.position - b.position);
      const index = sorted.findIndex((entry) => entry.id === sectionId);
      if (index < 0) continue;
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= sorted.length) return true;
      [sorted[index], sorted[target]] = [sorted[target], sorted[index]];
      sorted.forEach((section, position) => {
        section.position = position;
      });
      markPageDirty(page);
      return true;
    }
    return false;
  });
  return ok ? { ok: true, message: "Moved." } : { ok: false, message: "That section no longer exists." };
}

export async function duplicateSection(sectionId: string): Promise<AdminResult<{ id: string }>> {
  const id = createId("sec");
  const ok = mutate((db) => {
    for (const page of db.pages) {
      const section = page.sections.find((entry) => entry.id === sectionId);
      if (!section) continue;
      for (const entry of page.sections) {
        if (entry.position > section.position) entry.position += 1;
      }
      page.sections.push({
        ...structuredClone(section),
        id,
        position: section.position + 1,
      });
      renumber(page.sections);
      markPageDirty(page);
      return true;
    }
    return false;
  });

  return ok
    ? { ok: true, message: "Section duplicated.", data: { id } }
    : { ok: false, message: "That section no longer exists." };
}

export async function toggleSectionHidden(sectionId: string, hidden: boolean): Promise<AdminResult> {
  const ok = mutate((db) => {
    for (const page of db.pages) {
      const section = page.sections.find((entry) => entry.id === sectionId);
      if (!section) continue;
      section.isHidden = hidden;
      markPageDirty(page);
      return true;
    }
    return false;
  });
  return ok
    ? { ok: true, message: hidden ? "Section hidden." : "Section shown again." }
    : { ok: false, message: "That section no longer exists." };
}

export async function deleteSection(sectionId: string): Promise<AdminResult> {
  const ok = mutate((db) => {
    for (const page of db.pages) {
      if (!page.sections.some((entry) => entry.id === sectionId)) continue;
      page.sections = page.sections.filter((entry) => entry.id !== sectionId);
      renumber(page.sections);
      markPageDirty(page);
      return true;
    }
    return false;
  });
  return ok
    ? { ok: true, message: "Section deleted." }
    : { ok: false, message: "That section no longer exists." };
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
