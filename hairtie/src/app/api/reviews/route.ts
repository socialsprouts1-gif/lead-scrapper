import { NextResponse } from "next/server";
import { z } from "zod";
import { createId, mutate, now } from "@/lib/store";
import { productById } from "@/lib/catalog";

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
  if (!productById(data.productId)) {
    return NextResponse.json({ message: "Product not found." }, { status: 404 });
  }

  // Reviews start as PENDING and only count towards a product's rating once an
  // admin approves them, so the storefront cannot be spammed.
  mutate((db) => {
    db.reviews.unshift({
      id: createId("rev"),
      productId: data.productId,
      authorName: data.authorName,
      authorEmail: data.authorEmail || null,
      rating: data.rating,
      title: data.title || null,
      body: data.body,
      status: "PENDING",
      isVerified: false,
      createdAt: now(),
    });
  });

  return NextResponse.json({
    message: "Thank you — your review will appear once we've read it.",
  });
}
