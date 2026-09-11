import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/storefront/AuthForms";

export const metadata: Metadata = {
  title: "Sign in | Hairtie",
  robots: { index: false, follow: true },
};

export default async function LoginPage(props: PageProps<"/account/login">) {
  const user = await getCurrentUser();
  const params = await props.searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  if (user) redirect(next && next.startsWith("/") ? next : "/account");

  return (
    <div className="ht-container max-w-md py-16 md:py-24">
      <h1 className="text-center text-[2rem]">Welcome back</h1>
      <p className="mt-2 text-center text-sm" style={{ color: "var(--ht-muted)" }}>
        Sign in to see your orders and wishlist.
      </p>
      <div className="ht-card mt-8 p-7">
        <Suspense>
          <LoginForm next={next} />
        </Suspense>
      </div>
    </div>
  );
}
