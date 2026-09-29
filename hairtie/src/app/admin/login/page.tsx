import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { adminPasswordRequired, isAdminSignedIn } from "@/lib/admin-auth";
import { getSiteSettings } from "@/lib/settings";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const metadata: Metadata = {
  title: "Sign in | Shop manager",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  // Nothing to sign in to when no password is set, or when you already have.
  if (!adminPasswordRequired() || (await isAdminSignedIn())) redirect("/admin");

  const settings = getSiteSettings();

  return (
    <div className="adm flex min-h-screen items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-7 text-center">
          <p className="font-serif text-3xl" style={{ fontFamily: "var(--font-cormorant), serif" }}>
            {settings.storeName}
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--adm-muted)" }}>
            Shop manager
          </p>
        </div>

        <div className="adm-card p-6">
          <AdminLoginForm />
        </div>

        <p className="mt-5 text-center text-xs" style={{ color: "var(--adm-muted)" }}>
          This is the shop&rsquo;s own manager. Customers never see it.
        </p>
      </div>
    </div>
  );
}
