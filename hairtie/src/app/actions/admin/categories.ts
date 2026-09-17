"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createId, mutate, store } from "@/lib/store";
import { slugify } from "@/lib/utils";
import type { AdminResult } from "@/app/actions/admin/products";

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

function uniqueSlug(base: string, excludeId?: string) {
  const root = slugify(base) || "category";
  let candidate = root;
  let n = 2;
  while (store().categories.some((entry) => entry.slug === candidate && entry.id !== excludeId)) {
    candidate = `${root}-${n}`;
    n += 1;
  }
  return candidate;
}

export async function saveCategory(input: unknown, categoryId?: string): Promise<AdminResult> {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Please check the details." };
  }
  const data = parsed.data;

  if (categoryId && data.parentId === categoryId) {
    return { ok: false, message: "A category cannot sit inside itself." };
  }
  if (categoryId && data.parentId) {
    const children = store().categories.filter((entry) => entry.parentId === categoryId);
    if (children.some((child) => child.id === data.parentId)) {
      return { ok: false, message: "That would put the category inside one of its own subcategories." };
    }
  }

  mutate((db) => {
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
      const category = db.categories.find((entry) => entry.id === categoryId);
      if (!category) return;
      const desired = slugify(data.slug || data.name);
      Object.assign(category, payload, {
        slug: desired === category.slug ? category.slug : uniqueSlug(desired, categoryId),
      });
    } else {
      const maxPosition = db.categories.reduce((max, entry) => Math.max(max, entry.position), 0);
      db.categories.push({
        id: createId("cat"),
        slug: uniqueSlug(data.slug || data.name),
        position: maxPosition + 1,
        ...payload,
      });
    }
  });

  revalidatePath("/", "layout");
  return { ok: true, message: "Category saved." };
}

export async function deleteCategory(categoryId: string): Promise<AdminResult> {
  const hasChildren = store().categories.some((entry) => entry.parentId === categoryId);
  if (hasChildren) {
    return { ok: false, message: "Move or delete the subcategories inside this one first." };
  }

  const productCount = store().products.filter((product) => product.categoryId === categoryId).length;

  mutate((db) => {
    db.categories = db.categories.filter((entry) => entry.id !== categoryId);
    // Products are kept — they simply lose their category.
    for (const product of db.products) {
      if (product.categoryId === categoryId) product.categoryId = null;
    }
  });

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
  mutate((db) => {
    orderedIds.forEach((id, index) => {
      const category = db.categories.find((entry) => entry.id === id);
      if (category) category.position = index;
    });
  });
  revalidatePath("/", "layout");
  return { ok: true, message: "Order saved." };
}

export async function toggleCategoryFeatured(categoryId: string, featured: boolean): Promise<AdminResult> {
  mutate((db) => {
    const category = db.categories.find((entry) => entry.id === categoryId);
    if (category) category.isFeatured = featured;
  });
  revalidatePath("/", "layout");
  return { ok: true, message: featured ? "Shown on the homepage." : "Hidden from the homepage." };
}
