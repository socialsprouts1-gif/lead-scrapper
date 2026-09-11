import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { AdminPage, PageHeader } from "@/components/admin/ui";
import { ProductForm, EMPTY_PRODUCT } from "@/components/admin/ProductForm";

export default async function NewProductPage() {
  await requireAdmin();
  const categories = await prisma.category.findMany({
    orderBy: [{ position: "asc" }, { name: "asc" }],
    select: { id: true, name: true, parentId: true },
  });

  return (
    <AdminPage>
      <PageHeader
        title="Add a product"
        description="Fill in the basics and save. You can add photos and colours at any time afterwards."
        back={{ href: "/admin/products", label: "Products" }}
      />
      <ProductForm initial={EMPTY_PRODUCT} categories={categories} />
    </AdminPage>
  );
}
