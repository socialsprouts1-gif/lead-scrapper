import { NextResponse } from "next/server";
import { liveProducts, productsByIds, allProducts } from "@/lib/catalog";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = searchParams.get("ids")?.split(",").filter(Boolean);
  const q = searchParams.get("q")?.trim().toLowerCase();

  const products = ids?.length
    ? productsByIds(ids)
    : q
      ? allProducts()
          .filter(
            (product) =>
              product.status !== "ARCHIVED" &&
              (product.name.toLowerCase().includes(q) || product.sku.toLowerCase().includes(q)),
          )
          .slice(0, 20)
      : liveProducts().slice(0, 20);

  return NextResponse.json({
    products: products.map((product) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.images[0]?.url ?? null,
    })),
  });
}
