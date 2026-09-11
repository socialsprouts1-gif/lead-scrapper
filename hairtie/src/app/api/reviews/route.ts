import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const schema = z.object({
  productId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  authorName: z.string().trim().min(2).max(60),
  authorEmail: z.string().trim().email().optional().or(z.literal("")),
  title: z.string().trim().max(80).optional().or(z.literal("")),
  body: z.string().trim().min(4).max(1200),
});

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Please check your name, rating and review text." },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const product = await prisma.product.findUnique({
    where: { id: data.productId },
    select: { id: true },
  });
  if (!product) return NextResponse.json({ message: "Product not found." }, { status: 404 });

  const user = await getCurrentUser();

  // A review counts as verified only if this account actually bought the item.
  const verified = user
    ? (await prisma.orderItem.count({
        where: {
          productId: product.id,
          order: { userId: user.id, status: { in: ["DELIVERED", "SHIPPED"] } },
        },
      })) > 0
    : false;

  // Reviews start as PENDING and are only counted into a product's rating once
  // an admin approves them, so the storefront cannot be spammed.
  await prisma.review.create({
    data: {
      productId: product.id,
      userId: user?.id ?? null,
      authorName: data.authorName,
      authorEmail: data.authorEmail || user?.email || null,
      rating: data.rating,
      title: data.title || null,
      body: data.body,
      isVerified: verified,
      status: "PENDING",
    },
  });

  return NextResponse.json({
    message: "Thank you — your review will appear once we've read it.",
  });
}
