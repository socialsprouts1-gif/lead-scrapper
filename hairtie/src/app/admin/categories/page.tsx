import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { AdminPage, PageHeader } from "@/components/admin/ui";
import { CategoryManager, type CategoryNode } from "@/components/admin/CategoryManager";

export default async function AdminCategoriesPage() {
  await requireAdmin();

  const categories = await prisma.category.findMany({
    orderBy: [{ position: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });

  const byId = new Map(
    categories.map((category) => [
      category.id,
      {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        imageUrl: category.imageUrl,
        imageAlt: category.imageAlt,
        parentId: category.parentId,
        isFeatured: category.isFeatured,
        isActive: category.isActive,
        seoTitle: category.seoTitle,
        seoDescription: category.seoDescription,
        productCount: category._count.products,
        children: [] as CategoryNode[],
      } satisfies CategoryNode,
    ]),
  );

  const tree: CategoryNode[] = [];
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) byId.get(node.parentId)!.children.push(node);
    else tree.push(node);
  }

  return (
    <AdminPage>
      <PageHeader
        title="Categories"
        description="These are the groups customers browse by. Drag to reorder, and mark the ones you want on your homepage with the star."
      />
      <CategoryManager tree={tree} />
    </AdminPage>
  );
}
