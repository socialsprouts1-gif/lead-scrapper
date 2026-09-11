import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { getSiteSettings } from "@/lib/settings";
import { LoginForm } from "@/components/storefront/AuthForms";

export const metadata: Metadata = {
  title: "Sign in | Shop manager",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage(props: PageProps<"/admin/login">) {
  const user = await getCurrentUser();
  const params = await props.searchParams;
  const next = typeof params.next === "string" && params.next.startsWith("/admin") ? params.next : "/admin";
  if (user && isStaff(user.role)) redirect(next);

  const settings = await getSiteSettings();

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-serif text-3xl" style={{ fontFamily: "var(--font-cormorant), serif" }}>
            {settings.storeName}
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--adm-muted)" }}>
            Sign in to manage your shop
          </p>
        </div>
        <div className="adm-card p-7">
          <Suspense>
            <LoginForm next={next} />
          </Suspense>
        </div>
        {user && !isStaff(user.role) && (
          <p className="mt-5 text-center text-sm" style={{ color: "#9c3a3a" }}>
            You are signed in as a customer. Sign in with your admin account to continue.
          </p>
        )}
      </div>
    </div>
  );
}
