"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAdminOrNull } from "@/lib/auth";
import { getSectionDef, SECTION_REGISTRY } from "@/lib/sections";
import { markPageDirty, publishPage } from "@/lib/pages";
import { slugify, uniqueSlug } from "@/lib/utils";
import type { Prisma } from "@/generated/prisma/client";
import type { AdminResult } from "@/app/actions/admin/products";

async function guard() {
  const admin = await getAdminOrNull();
  if (!admin) throw new Error("Not authorised.");
  return admin;
}

export async function addSection(
  pageId: string,
  type: string,
  afterPosition?: number,
): Promise<AdminResult<{ id: string }>> {
  await guard();
  const def = getSectionDef(type);
  if (!def) return { ok: false, message: "Unknown section type." };

  const sections = await prisma.section.findMany({
    where: { pageId },
    orderBy: { position: "asc" },
    select: { id: true },
  });

  const insertAt = afterPosition === undefined ? sections.length : afterPosition + 1;

  await prisma.$transaction([
    ...sections.slice(insertAt).map((section, index) =>
      prisma.section.update({ where: { id: section.id }, data: { position: insertAt + index + 1 } }),
    ),
  ]);

  const created = await prisma.section.create({
    data: {
      pageId,
      type,
      position: insertAt,
      settings: def.defaults as Prisma.InputJsonObject,
    },
    select: { id: true },
  });

  await markPageDirty(pageId);
  return { ok: true, message: `${def.label} added.`, data: { id: created.id } };
}

export async function updateSection(sectionId: string, settings: unknown): Promise<AdminResult> {
  await guard();
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return { ok: false, message: "Could not read those settings." };
  }
  const section = await prisma.section.update({
    where: { id: sectionId },
    data: { settings: settings as Prisma.InputJsonObject },
    select: { pageId: true },
  });
  await markPageDirty(section.pageId);
  return { ok: true, message: "Saved." };
}

export async function reorderSections(pageId: string, orderedIds: string[]): Promise<AdminResult> {
  await guard();
  await prisma.$transaction(
    orderedIds.map((id, index) => prisma.section.update({ where: { id }, data: { position: index } })),
  );
  await markPageDirty(pageId);
  return { ok: true, message: "Order saved." };
}

export async function moveSection(sectionId: string, direction: "up" | "down"): Promise<AdminResult> {
  await guard();
  const section = await prisma.section.findUnique({ where: { id: sectionId } });
  if (!section) return { ok: false, message: "That section no longer exists." };

  const siblings = await prisma.section.findMany({
    where: { pageId: section.pageId },
    orderBy: { position: "asc" },
    select: { id: true },
  });
  const index = siblings.findIndex((entry) => entry.id === sectionId);
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= siblings.length) return { ok: true };

  const next = [...siblings];
  [next[index], next[target]] = [next[target], next[index]];

  await prisma.$transaction(
    next.map((entry, position) => prisma.section.update({ where: { id: entry.id }, data: { position } })),
  );
  await markPageDirty(section.pageId);
  return { ok: true, message: "Moved." };
}

export async function duplicateSection(sectionId: string): Promise<AdminResult<{ id: string }>> {
  await guard();
  const section = await prisma.section.findUnique({ where: { id: sectionId } });
  if (!section) return { ok: false, message: "That section no longer exists." };

  const after = await prisma.section.findMany({
    where: { pageId: section.pageId, position: { gt: section.position } },
    orderBy: { position: "asc" },
    select: { id: true },
  });
  await prisma.$transaction(
    after.map((entry, index) =>
      prisma.section.update({ where: { id: entry.id }, data: { position: section.position + index + 2 } }),
    ),
  );

  const copy = await prisma.section.create({
    data: {
      pageId: section.pageId,
      type: section.type,
      position: section.position + 1,
      isHidden: section.isHidden,
      settings: section.settings as Prisma.InputJsonObject,
    },
    select: { id: true },
  });

  await markPageDirty(section.pageId);
  return { ok: true, message: "Section duplicated.", data: { id: copy.id } };
}

export async function toggleSectionHidden(sectionId: string, hidden: boolean): Promise<AdminResult> {
  await guard();
  const section = await prisma.section.update({
    where: { id: sectionId },
    data: { isHidden: hidden },
    select: { pageId: true },
  });
  await markPageDirty(section.pageId);
  return { ok: true, message: hidden ? "Section hidden." : "Section shown again." };
}

export async function deleteSection(sectionId: string): Promise<AdminResult> {
  await guard();
  const section = await prisma.section.delete({ where: { id: sectionId }, select: { pageId: true } });
  await markPageDirty(section.pageId);
  return { ok: true, message: "Section deleted." };
}

export async function publishPageChanges(slug: string): Promise<AdminResult> {
  await guard();
  const page = await publishPage(slug);
  if (!page) return { ok: false, message: "That page no longer exists." };
  revalidatePath("/", "layout");
  return { ok: true, message: "Published — your changes are live." };
}

export async function discardPageChanges(slug: string): Promise<AdminResult> {
  await guard();
  const page = await prisma.page.findUnique({ where: { slug } });
  if (!page) return { ok: false, message: "That page no longer exists." };

  const snapshot = page.publishedSnapshot;
  if (!Array.isArray(snapshot)) {
    return { ok: false, message: "This page has never been published, so there is nothing to go back to." };
  }

  // Rebuild the draft from the last published snapshot.
  await prisma.$transaction(async (tx) => {
    await tx.section.deleteMany({ where: { pageId: page.id } });
    for (const [index, entry] of (snapshot as unknown[]).entries()) {
      const row = entry as Record<string, unknown>;
      if (!row.type) continue;
      await tx.section.create({
        data: {
          pageId: page.id,
          type: String(row.type),
          position: index,
          isHidden: Boolean(row.isHidden),
          settings: (row.settings ?? {}) as Prisma.InputJsonObject,
        },
      });
    }
    await tx.page.update({ where: { id: page.id }, data: { hasDraftChanges: false } });
  });

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
  await guard();
  const parsed = pageMetaSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Please check the page details." };
  const data = parsed.data;

  await prisma.page.update({
    where: { id: pageId },
    data: {
      title: data.title,
      seoTitle: data.seoTitle || null,
      seoDescription: data.seoDescription || null,
      ogImageUrl: data.ogImageUrl || null,
      ...(data.isPublished === undefined ? {} : { isPublished: data.isPublished }),
    },
  });

  revalidatePath("/", "layout");
  return { ok: true, message: "Page details saved." };
}

export async function createPage(title: string): Promise<AdminResult<{ slug: string }>> {
  await guard();
  const clean = title.trim();
  if (clean.length < 2) return { ok: false, message: "Please give the page a name." };

  const slug = await uniqueSlug(slugify(clean), async (candidate) =>
    Boolean(await prisma.page.findUnique({ where: { slug: candidate }, select: { id: true } })),
  );

  // Reserved paths would shadow real storefront routes.
  const reserved = ["shop", "cart", "checkout", "account", "admin", "api", "products", "categories", "order", "wishlist", "preview", "track-order"];
  if (reserved.includes(slug)) {
    return { ok: false, message: `"${slug}" is used by the shop itself. Please pick another name.` };
  }

  const hero = SECTION_REGISTRY.find((entry) => entry.type === "textSection")!;
  await prisma.page.create({
    data: {
      slug,
      title: clean,
      isPublished: false,
      sections: {
        create: [
          {
            type: hero.type,
            position: 0,
            settings: { ...hero.defaults, heading: clean, body: "Write something here." } as Prisma.InputJsonObject,
          },
        ],
      },
    },
  });

  revalidatePath("/admin/editor");
  return { ok: true, message: "Page created.", data: { slug } };
}

export async function deletePage(pageId: string): Promise<AdminResult> {
  await guard();
  const page = await prisma.page.findUnique({ where: { id: pageId } });
  if (!page) return { ok: false, message: "That page no longer exists." };
  if (page.isSystem) {
    return { ok: false, message: "This is a built-in page and cannot be deleted. You can unpublish it instead." };
  }
  await prisma.page.delete({ where: { id: pageId } });
  revalidatePath("/", "layout");
  return { ok: true, message: "Page deleted." };
}
