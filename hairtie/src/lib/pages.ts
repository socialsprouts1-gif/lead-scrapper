import "server-only";
import { createId, mutate, now, store } from "@/lib/store";
import type { Page, Section } from "@/lib/types";

/**
 * Pages have two states:
 *   sections[]         — the working draft the admin edits
 *   publishedSnapshot  — the copy the public storefront renders
 *
 * That split is what makes Preview → Save → Publish work: saving in the editor
 * only touches the draft, so the live site never changes until Publish is hit.
 */

export function allPages() {
  return [...store().pages].sort(
    (a, b) => Number(b.isSystem) - Number(a.isSystem) || a.slug.localeCompare(b.slug),
  );
}

export function pageBySlug(slug: string) {
  return store().pages.find((page) => page.slug === slug) ?? null;
}

export function pageById(id: string) {
  return store().pages.find((page) => page.id === id) ?? null;
}

function ordered(sections: Section[]) {
  return [...sections].sort((a, b) => a.position - b.position);
}

export function getPublishedPage(slug: string) {
  const page = pageBySlug(slug);
  if (!page || !page.isPublished) return null;
  const sections = page.publishedSnapshot ?? page.sections;
  return { page, sections: ordered(sections).filter((section) => section.type) };
}

export function getDraftPage(slug: string) {
  const page = pageBySlug(slug);
  if (!page) return null;
  return { page, sections: ordered(page.sections) };
}

export function publishPage(slug: string) {
  return mutate((data) => {
    const page = data.pages.find((entry) => entry.slug === slug);
    if (!page) return null;
    page.publishedSnapshot = ordered(page.sections).map((section) => ({ ...section }));
    page.hasDraftChanges = false;
    page.updatedAt = now();
    return page;
  });
}

export function discardPageDraft(slug: string) {
  return mutate((data) => {
    const page = data.pages.find((entry) => entry.slug === slug);
    if (!page) return { ok: false as const, reason: "That page no longer exists." };
    if (!page.publishedSnapshot) {
      return {
        ok: false as const,
        reason: "This page has never been published, so there is nothing to go back to.",
      };
    }
    page.sections = page.publishedSnapshot.map((section) => ({ ...section }));
    page.hasDraftChanges = false;
    page.updatedAt = now();
    return { ok: true as const };
  });
}

export function markPageDirty(page: Page) {
  page.hasDraftChanges = true;
  page.updatedAt = now();
}

export function newSection(type: string, position: number, settings: Record<string, unknown>): Section {
  return { id: createId("sec"), type, position, isHidden: false, settings };
}

/** Renumbers positions 0..n so drag-and-drop ordering stays stable. */
export function renumber(sections: Section[]) {
  ordered(sections).forEach((section, index) => {
    section.position = index;
  });
}
