import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import type { Prisma } from "@/generated/prisma/client";
import { AdminPage, EmptyState, PageHeader, Pagination } from "@/components/admin/ui";
import { FilterSelect, SearchInput } from "@/components/admin/Controls";
import { ProductTable, type ProductRow } from "@/components/admin/ProductTable";

const PER_PAGE = 25;

export default async function AdminProductsPage(props: PageProps<"/admin/products">) {
  await requireAdmin();
  const params = await props.searchParams;

  const q = typeof params.q === "string" ? params.q.trim() : "";
  const status = typeof params.status === "string" ? params.status : "";
  const category = typeof params.category === "string" ? params.category : "";
  const stockFilter = typeof params.stock === "string" ? params.stock : "";
  const page = Math.max(Number(params.page ?? 1), 1);

  const where: Prisma.ProductWhereInput = {};
  const and: Prisma.ProductWhereInput[] = [];

  if (q) {
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  if (status === "DRAFT" || status === "ACTIVE" || status === "ARCHIVED") and.push({ status });
  if (category) and.push({ categoryId: category });
  if (stockFilter === "low") {
    and.push({ trackInventory: true, stock: { lte: 5 } });
  } else if (stockFilter === "out") {
    and.push({ trackInventory: true, stock: { lte: 0 } });
  }
  if (and.length) where.AND = and;

  const [products, total, categories, counts] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true, name: true, slug: true, sku: true, price: true, mrp: true,
        stock: true, lowStockThreshold: true, trackInventory: true, status: true,
        salesCount: true,
        category: { select: { name: true } },
        images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
        _count: { select: { variants: true } },
      },
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({ orderBy: [{ position: "asc" }], select: { id: true, name: true, parentId: true } }),
    prisma.product.groupBy({ by: ["status"], _count: true }),
  ]);

  const rows: ProductRow[] = products.map((product) => ({
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
    categoryName: product.category?.name ?? null,
    imageUrl: product.images[0]?.url ?? null,
    variantCount: product._count.variants,
    salesCount: product.salesCount,
  }));

  const pageCount = Math.ceil(total / PER_PAGE);
  const countFor = (value: string) => counts.find((c) => c.status === value)?._count ?? 0;

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
