import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { RegisterForm } from "@/components/storefront/AuthForms";

export const metadata: Metadata = {
  title: "Create an account | Hairtie",
  robots: { index: false, follow: true },
};

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/account");

  return (
    <div className="ht-container max-w-md py-16 md:py-24">
      <h1 className="text-center text-[2rem]">Create your account</h1>
      <p className="mt-2 text-center text-sm" style={{ color: "var(--ht-muted)" }}>
        Keep your orders, addresses and wishlist in one place.
      </p>
      <div className="ht-card mt-8 p-7">
        <RegisterForm />
      </div>
    </div>
  );
}
