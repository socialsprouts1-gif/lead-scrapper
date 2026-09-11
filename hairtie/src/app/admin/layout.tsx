import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { getSiteSettings } from "@/lib/settings";
import { AdminNav } from "@/components/admin/AdminNav";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "Shop manager | Hairtie",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await getCurrentUser();
  const settings = await getSiteSettings();

  // The sign-in page lives under /admin too, so an unauthenticated visitor gets
  // the bare shell rather than a redirect loop.
  if (!user || !isStaff(user.role)) {
    return (
      <div className="adm min-h-screen">
        <ToastProvider>{children}</ToastProvider>
      </div>
    );
  }

  const [pendingOrders, pendingReviews] = await Promise.all([
    prisma.order.count({ where: { status: { in: ["PENDING", "CONFIRMED"] } } }),
    prisma.review.count({ where: { status: "PENDING" } }),
  ]);

  return (
    <div className="adm min-h-screen lg:flex">
      <ToastProvider>
        <AdminNav
          storeName={settings.storeName}
          userName={user.name}
          pendingOrders={pendingOrders}
          pendingReviews={pendingReviews}
        />
        <main className="min-w-0 flex-1 pb-16">{children}</main>
      </ToastProvider>
    </div>
  );
}
