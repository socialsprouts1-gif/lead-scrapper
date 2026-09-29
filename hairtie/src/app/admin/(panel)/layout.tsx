import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { adminPasswordRequired, isAdminSignedIn } from "@/lib/admin-auth";
import { isPersistent } from "@/lib/store";
import { getSiteSettings } from "@/lib/settings";
import { allOrders } from "@/lib/orders";
import { pendingReviewCount } from "@/lib/reviews";
import { AdminNav } from "@/components/admin/AdminNav";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "Shop manager | Hairtie",
  robots: { index: false, follow: false },
};

/**
 * Everything under /admin sits inside this layout, and the sign-in page
 * deliberately does not — otherwise the redirect below would bounce off itself.
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  if (!(await isAdminSignedIn())) redirect("/admin/login");

  const settings = getSiteSettings();

  const pendingOrders = allOrders().filter((order) =>
    ["PENDING", "CONFIRMED"].includes(order.status),
  ).length;

  return (
    <div className="adm min-h-screen lg:flex">
      <ToastProvider>
        <AdminNav
          storeName={settings.storeName}
          pendingOrders={pendingOrders}
          pendingReviews={pendingReviewCount()}
          temporaryStorage={!isPersistent()}
          canSignOut={adminPasswordRequired()}
        />
        <main className="min-w-0 flex-1 pb-16">{children}</main>
      </ToastProvider>
    </div>
  );
}
