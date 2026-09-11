import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { allCategories, allProducts, stockOf } from "@/lib/catalog";
import { AdminPage, EmptyState, PageHeader, Pagination } from "@/components/admin/ui";
import { FilterSelect, SearchInput } from "@/components/admin/Controls";
import { ProductTable, type ProductRow } from "@/components/admin/ProductTable";

const PER_PAGE = 25;

export default async function AdminProductsPage(props: PageProps<"/admin/products">) {
  const params = await props.searchParams;

  const q = typeof params.q === "string" ? params.q.trim() : "";
  const status = typeof params.status === "string" ? params.status : "";
  const category = typeof params.category === "string" ? params.category : "";
  const stockFilter = typeof params.stock === "string" ? params.stock : "";
  const page = Math.max(Number(params.page ?? 1), 1);

  const categories = allCategories();
  const categoryNames = new Map(categories.map((entry) => [entry.id, entry.name]));
  const everything = allProducts();

  const matched = everything
    .filter((product) => {
      if (q) {
        const term = q.toLowerCase();
        const hit =
          product.name.toLowerCase().includes(term) ||
          product.sku.toLowerCase().includes(term) ||
          product.slug.toLowerCase().includes(term);
        if (!hit) return false;
      }
      if (status && product.status !== status) return false;
      if (category && product.categoryId !== category) return false;
      if (stockFilter === "low" && !(product.trackInventory && stockOf(product) <= 5)) return false;
      if (stockFilter === "out" && !(product.trackInventory && stockOf(product) <= 0)) return false;
      return true;
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const total = matched.length;
  const rows: ProductRow[] = matched
    .slice((page - 1) * PER_PAGE, page * PER_PAGE)
    .map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      price: product.price,
      mrp: product.mrp,
      stock: product.stock,
      lowStockThreshold: product.lowStockThreshold,
      trackInventory: product.trackInventory,
      status: product.status,
      categoryName: product.categoryId ? (categoryNames.get(product.categoryId) ?? null) : null,
      imageUrl: product.images[0]?.url ?? null,
      variantCount: product.variants.length,
      salesCount: product.salesCount,
    }));

  const pageCount = Math.ceil(total / PER_PAGE);
  const countFor = (value: string) => everything.filter((product) => product.status === value).length;

  function hrefFor(target: number) {
    const next = new URLSearchParams(
      Object.entries(params).flatMap(([key, value]) =>
        typeof value === "string" ? [[key, value]] : [],
      ) as [string, string][],
    );
    next.set("page", String(target));
    return `/admin/products?${next.toString()}`;
  }

  return (
    <AdminPage>
      <PageHeader
        title="Products"
        description={`${countFor("ACTIVE")} live · ${countFor("DRAFT")} drafts · ${countFor("ARCHIVED")} archived`}
      >
        <Link href="/admin/products/new" className="adm-btn adm-btn-primary">
          <Plus size={15} strokeWidth={1.8} /> Add product
        </Link>
      </PageHeader>

      <Suspense fallback={<div className="h-10" />}>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <SearchInput placeholder="Search by name or SKU" />
          <FilterSelect
            name="status"
            label="Status"
            allLabel="All statuses"
            options={[
              { value: "ACTIVE", label: "Live" },
              { value: "DRAFT", label: "Drafts" },
              { value: "ARCHIVED", label: "Archived" },
            ]}
          />
          <FilterSelect
            name="category"
            label="Category"
            allLabel="All categories"
            options={categories.map((c) => ({
              value: c.id,
              label: c.parentId ? `— ${c.name}` : c.name,
            }))}
          />
          <FilterSelect
            name="stock"
            label="Stock"
            allLabel="Any stock"
            options={[
              { value: "low", label: "Running low" },
              { value: "out", label: "Sold out" },
            ]}
          />
        </div>
      </Suspense>

      {rows.length === 0 ? (
        <EmptyState
          title={q || status || category ? "Nothing matched that" : "No products yet"}
          description={
            q || status || category
              ? "Try a different search, or clear the filters."
              : "Add your first product and it will appear on the shop straight away."
          }
          action={
            <Link href="/admin/products/new" className="adm-btn adm-btn-primary">
              <Plus size={15} strokeWidth={1.8} /> Add product
            </Link>
          }
        />
      ) : (
        <>
          <ProductTable products={rows} />
          <Pagination page={page} pageCount={pageCount} hrefFor={hrefFor} />
        </>
      )}
    </AdminPage>
  );
}
