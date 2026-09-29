"use server";

import { redirect } from "next/navigation";
import { signInAdmin, signOutAdmin } from "@/lib/admin-auth";
import type { AdminResult } from "@/app/actions/admin/products";

export async function submitAdminPassword(password: unknown): Promise<AdminResult> {
  if (typeof password !== "string" || password.length === 0) {
    return { ok: false, message: "Enter the password." };
  }
  const result = await signInAdmin(password);
  return result.ok ? { ok: true, message: "Welcome back." } : { ok: false, message: result.reason };
}

export async function signOut() {
  await signOutAdmin();
  redirect("/admin/login");
}
