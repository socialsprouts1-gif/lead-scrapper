"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAdminOrNull } from "@/lib/auth";
import { slugify, uniqueSlug } from "@/lib/utils";
import type { AdminResult } from "@/app/actions/admin/products";

async function guard() {
  const admin = await getAdminOrNull();
  if (!admin) throw new Error("Not authorised.");
}

const categorySchema = z.object({
  name: z.string().trim().min(2, "Please give the category a name.").max(80),
  slug: z.string().trim().max(80).optional().or(z.literal("")),
  description: z.string().trim().max(600).optional().or(z.literal("")),
  imageUrl: z.string().trim().max(500).optional().or(z.literal("")),
  imageAlt: z.string().trim().max(200).optional().or(z.literal("")),
  parentId: z.string().optional().or(z.literal("")),
  isFeatured: z.boolean(),
  isActive: z.boolean(),
  seoTitle: z.string().trim().max(160).optional().or(z.literal("")),
  seoDescription: z.string().trim().max(320).optional().or(z.literal("")),
});

export async function saveCategory(input: unknown, categoryId?: string): Promise<AdminResult> {
  await guard();
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Please check the details." };
  }
  const data = parsed.data;

  if (categoryId && data.parentId === categoryId) {
    return { ok: false, message: "A category cannot sit inside itself." };
  }

  const payload = {
    name: data.name,
    description: data.description || null,
    imageUrl: data.imageUrl || null,
    imageAlt: data.imageAlt || null,
    parentId: data.parentId || null,
    isFeatured: data.isFeatured,
    isActive: data.isActive,
    seoTitle: data.seoTitle || null,
    seoDescription: data.seoDescription || null,
  };

  if (categoryId) {
    const current = await prisma.category.findUnique({ where: { id: categoryId }, select: { slug: true } });
    if (!current) return { ok: false, message: "That category no longer exists." };

    // Moving a parent under one of its own children would create a loop.
    if (data.parentId) {
      const children = await prisma.category.findMany({ where: { parentId: categoryId }, select: { id: true } });
      if (children.some((child) => child.id === data.parentId)) {
        return { ok: false, message: "That would put the category inside one of its own subcategories." };
      }
    }

    const desired = slugify(data.slug || data.name);
    const slug =
      desired === current.slug
        ? current.slug
        : await uniqueSlug(desired, async (candidate) => {
            const found = await prisma.category.findUnique({ where: { slug: candidate }, select: { id: true } });
            return Boolean(found && found.id !== categoryId);
          });

    await prisma.category.update({ where: { id: categoryId }, data: { ...payload, slug } });
  } else {
    const slug = await uniqueSlug(data.slug || data.name, async (candidate) =>
      Boolean(await prisma.category.findUnique({ where: { slug: candidate }, select: { id: true } })),
    );
    const max = await prisma.category.aggregate({ _max: { position: true } });
    await prisma.category.create({
      data: { ...payload, slug, position: (max._max.position ?? 0) + 1 },
    });
  }

  revalidatePath("/", "layout");
  return { ok: true, message: "Category saved." };
}

export async function deleteCategory(categoryId: string): Promise<AdminResult> {
  await guard();
  const [productCount, childCount] = await Promise.all([
    prisma.product.count({ where: { categoryId } }),
    prisma.category.count({ where: { parentId: categoryId } }),
  ]);

  if (childCount > 0) {
    return { ok: false, message: "Move or delete the subcategories inside this one first." };
  }

  // Products are kept — they simply lose their category.
  await prisma.category.delete({ where: { id: categoryId } });
  revalidatePath("/", "layout");
  return {
    ok: true,
    message:
      productCount > 0
        ? `Category deleted. ${productCount} ${productCount === 1 ? "product is" : "products are"} now uncategorised.`
        : "Category deleted.",
  };
}

export async function reorderCategories(orderedIds: string[]): Promise<AdminResult> {
  await guard();
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.category.update({ where: { id }, data: { position: index } }),
    ),
  );
  revalidatePath("/", "layout");
  return { ok: true, message: "Order saved." };
}

export async function toggleCategoryFeatured(categoryId: string, featured: boolean): Promise<AdminResult> {
  await guard();
  await prisma.category.update({ where: { id: categoryId }, data: { isFeatured: featured } });
  revalidatePath("/", "layout");
  return { ok: true, message: featured ? "Shown on the homepage." : "Hidden from the homepage." };
}
