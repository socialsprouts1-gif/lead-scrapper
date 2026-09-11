import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

/**
 * Newsletter sign-ups are stored as customer records with a marketing note, so
 * the list is visible in Admin → Customers without needing a separate table or
 * a third-party mailing service on day one.
 */
const schema = z.object({ email: z.email() });

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: "Please enter a valid email address." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, notes: true } });

  if (existing) {
    if (!existing.notes?.includes("newsletter")) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { notes: [existing.notes, "newsletter"].filter(Boolean).join(" · ") },
      });
    }
  } else {
    // A random unusable password: this is a marketing contact, not a login.
    await prisma.user.create({
      data: {
        email,
        name: email.split("@")[0],
        passwordHash: await hashPassword(crypto.randomUUID() + crypto.randomUUID()),
        notes: "newsletter",
      },
    });
  }

  return NextResponse.json({ message: "Thank you — you're on the list." });
}
