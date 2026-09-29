"use server";

import { denyUnlessAdmin } from "@/lib/admin-auth";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { saveCustomerProfile } from "@/lib/customers";
import type { AdminResult } from "@/app/actions/admin/products";

const schema = z.object({
  email: z.string().trim().email(),
  note: z.string().max(2000),
  tags: z.array(z.string().trim().min(1).max(40)).max(12),
  isBlocked: z.boolean(),
});

/** Saves the shop owner's own notes about a customer. */
export async function updateCustomerProfile(input: unknown): Promise<AdminResult> {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Please check those details." };

  const data = parsed.data;
  saveCustomerProfile(data.email, {
    note: data.note.trim(),
    // Trimmed, de-duplicated and case-insensitively unique.
    tags: [...new Map(data.tags.map((tag) => [tag.toLowerCase(), tag])).values()],
    isBlocked: data.isBlocked,
  });

  revalidatePath("/admin/customers");
  return {
    ok: true,
    message: data.isBlocked ? "Saved. This customer can no longer order." : "Saved.",
  };
}
