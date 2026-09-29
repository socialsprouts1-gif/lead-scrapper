import { allCategories, productCount } from "@/lib/catalog";
import { AdminPage, PageHeader } from "@/components/admin/ui";
import { CategoryManager, type CategoryNode } from "@/components/admin/CategoryManager";

export default async function AdminCategoriesPage() {

  const byId = new Map(
    allCategories().map((category) => [
      category.id,
      {
        ...category,
        productCount: productCount(category.id, false),
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
