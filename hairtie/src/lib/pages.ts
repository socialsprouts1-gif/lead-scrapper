import "server-only";
import { prisma } from "@/lib/db";
import type { SectionData } from "@/components/sections/SectionRenderer";

/**
 * Pages have two states:
 *   sections[]         — the working draft the admin edits
 *   publishedSnapshot  — the copy the public storefront renders
 *
 * That split is what makes Preview → Save → Publish work: saving in the editor
 * only touches the draft, so the live site never changes until Publish is hit.
 */

export async function getPublishedPage(slug: string) {
  const page = await prisma.page.findUnique({
    where: { slug },
    include: { sections: { orderBy: { position: "asc" } } },
  });
  if (!page || !page.isPublished) return null;

  const snapshot = page.publishedSnapshot;
  const sections: SectionData[] = Array.isArray(snapshot)
    ? (snapshot as unknown[]).map((entry, index) => {
        const row = entry as Record<string, unknown>;
        return {
          id: String(row.id ?? `snapshot-${index}`),
          type: String(row.type ?? ""),
          isHidden: Boolean(row.isHidden),
          settings: row.settings ?? {},
        };
      })
    : page.sections.map((section) => ({
        id: section.id,
        type: section.type,
        isHidden: section.isHidden,
        settings: section.settings,
      }));

  return { page, sections: sections.filter((section) => section.type) };
}

export async function getDraftPage(slug: string) {
  const page = await prisma.page.findUnique({
    where: { slug },
    include: { sections: { orderBy: { position: "asc" } } },
  });
  if (!page) return null;
  return {
    page,
    sections: page.sections.map((section) => ({
      id: section.id,
      type: section.type,
      isHidden: section.isHidden,
      settings: section.settings,
    })) as SectionData[],
  };
}

export async function publishPage(slug: string) {
  const page = await prisma.page.findUnique({
    where: { slug },
    include: { sections: { orderBy: { position: "asc" } } },
  });
  if (!page) return null;

  const snapshot = page.sections.map((section) => ({
    id: section.id,
    type: section.type,
    isHidden: section.isHidden,
    settings: section.settings,
  }));

  return prisma.page.update({
    where: { id: page.id },
    data: { publishedSnapshot: snapshot, hasDraftChanges: false },
  });
}

export async function markPageDirty(pageId: string) {
  await prisma.page.update({ where: { id: pageId }, data: { hasDraftChanges: true } });
}
