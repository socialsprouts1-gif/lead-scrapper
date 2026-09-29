import { notFound } from "next/navigation";
import { allCategories, productById } from "@/lib/catalog";
import { AdminPage, PageHeader } from "@/components/admin/ui";
import { ProductForm, type ProductFormValues } from "@/components/admin/ProductForm";

function rupees(paise: number | null | undefined) {
  if (paise === null || paise === undefined) return "";
  return String(paise / 100);
}

export default async function EditProductPage(props: PageProps<"/admin/products/[id]">) {
  const { id } = await props.params;

  const product = productById(id);
  const categories = allCategories();

  if (!product) notFound();

  const initial: ProductFormValues = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    brand: product.brand,
    categoryId: product.categoryId ?? "",
    shortDescription: product.shortDescription ?? "",
    description: product.description,
    mrp: rupees(product.mrp),
    price: rupees(product.price),
    costPrice: rupees(product.costPrice),
    stock: String(product.stock),
    lowStockThreshold: String(product.lowStockThreshold),
    trackInventory: product.trackInventory,
    allowBackorder: product.allowBackorder,
    hsnCode: product.hsnCode ?? "",
    gstRate: String(product.gstRate),
    priceIncludesTax: product.priceIncludesTax,
    weightGrams: product.weightGrams ? String(product.weightGrams) : "",
    lengthCm: product.lengthCm ? String(product.lengthCm) : "",
    widthCm: product.widthCm ? String(product.widthCm) : "",
    heightCm: product.heightCm ? String(product.heightCm) : "",
    material: product.material ?? "",
    careInstructions: product.careInstructions ?? "",
    countryOfOrigin: product.countryOfOrigin,
    videoUrl: product.videoUrl ?? "",
    isNewArrival: product.isNewArrival,
    isBestseller: product.isBestseller,
    isTrending: product.isTrending,
    isFeatured: product.isFeatured,
    isOnSale: product.isOnSale,
    status: product.status,
    seoTitle: product.seoTitle ?? "",
    seoDescription: product.seoDescription ?? "",
    seoKeywords: product.seoKeywords ?? "",
    ogImageUrl: product.ogImageUrl ?? "",
    canonicalUrl: product.canonicalUrl ?? "",
    images: product.images.map((image) => ({ url: image.url, alt: image.alt })),
    variants: product.variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      sku: variant.sku,
      color: variant.color ?? "",
      colorHex: variant.colorHex ?? "#e9c2c0",
      size: variant.size ?? "",
      price: rupees(variant.price),
      mrp: rupees(variant.mrp),
      stock: String(variant.stock),
      imageUrl: variant.imageUrl ?? "",
      isActive: variant.isActive,
    })),
    attributes: product.attributes.map((attribute) => ({ ...attribute })),
    tags: product.tags,
  };

  return (
    <AdminPage>
      <PageHeader
        title={product.name}
        description={`SKU ${product.sku} · ${product.salesCount} sold · ${product.viewCount} views`}
        back={{ href: "/admin/products", label: "Products" }}
      />
      <ProductForm initial={initial} categories={categories} />
    </AdminPage>
  );
}
