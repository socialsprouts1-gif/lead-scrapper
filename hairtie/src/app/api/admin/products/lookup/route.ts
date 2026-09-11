import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminOrNull } from "@/lib/auth";

export async function GET(request: Request) {
  if (!(await getAdminOrNull())) return NextResponse.json({ message: "Not authorised." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const ids = searchParams.get("ids")?.split(",").filter(Boolean);
  const q = searchParams.get("q")?.trim();

  const products = await prisma.product.findMany({
    where: ids?.length
      ? { id: { in: ids } }
      : q
        ? {
            status: { not: "ARCHIVED" },
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { sku: { contains: q, mode: "insensitive" } },
            ],
          }
        : { status: "ACTIVE" },
    take: 20,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      price: true,
      images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
    },
  });

  return NextResponse.json({
    products: products.map((product) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.images[0]?.url ?? null,
    })),
  });
}
