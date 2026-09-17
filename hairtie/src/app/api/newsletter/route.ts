import { NextResponse } from "next/server";
import { z } from "zod";
import { mutate, now, store } from "@/lib/store";

/**
 * Newsletter sign-ups are kept as a simple list, visible in
 * Admin → Customers → Mailing list. There are no accounts to create.
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
  if (!store().newsletter.some((entry) => entry.email === email)) {
    mutate((data) => {
      data.newsletter.unshift({ email, createdAt: now() });
    });
  }

  return NextResponse.json({ message: "Thank you — you're on the list." });
}
