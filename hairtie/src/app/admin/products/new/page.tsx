import { allCategories } from "@/lib/catalog";
import { AdminPage, PageHeader } from "@/components/admin/ui";
import { ProductForm, EMPTY_PRODUCT } from "@/components/admin/ProductForm";

export default async function NewProductPage() {
  const categories = allCategories();

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
