"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, Package, FolderTree, ReceiptText, Users, Paintbrush,
  Images, TicketPercent, MessageSquareText, ChartNoAxesColumn, Settings,
  Menu, X, ExternalLink, Palette,
} from "lucide-react";

const GROUPS: { title: string; items: { href: string; label: string; icon: React.ElementType }[] }[] = [
  {
    title: "Every day",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/orders", label: "Orders", icon: ReceiptText },
      { href: "/admin/products", label: "Products", icon: Package },
      { href: "/admin/categories", label: "Categories", icon: FolderTree },
    ],
  },
  {
    title: "Your website",
    items: [
      { href: "/admin/editor", label: "Website Editor", icon: Paintbrush },
      { href: "/admin/appearance", label: "Appearance", icon: Palette },
      { href: "/admin/media", label: "Media", icon: Images },
    ],
  },
  {
    title: "Growing the shop",
    items: [
      { href: "/admin/customers", label: "Customers", icon: Users },
      { href: "/admin/discounts", label: "Discounts", icon: TicketPercent },
      { href: "/admin/reviews", label: "Reviews", icon: MessageSquareText },
      { href: "/admin/analytics", label: "Analytics", icon: ChartNoAxesColumn },
      { href: "/admin/settings", label: "Store Settings", icon: Settings },
    ],
  },
];

export function AdminNav({
  storeName,
  pendingOrders,
  pendingReviews,
  temporaryStorage,
}: {
  storeName: string;
  pendingOrders: number;
  pendingReviews: number;
  temporaryStorage: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-6 pt-6">
        <Link href="/admin" className="font-serif text-2xl" style={{ fontFamily: "var(--font-cormorant), serif" }}>
          {storeName}
        </Link>
        <p className="mt-0.5 text-xs" style={{ color: "var(--adm-muted)" }}>
          Shop manager
        </p>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4" aria-label="Admin">
        {GROUPS.map((group) => (
          <div key={group.title}>
            <p className="px-2 pb-2 text-[0.66rem] font-semibold uppercase tracking-wider" style={{ color: "var(--adm-muted)" }}>
              {group.title}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
                const badge =
                  item.href === "/admin/orders"
                    ? pendingOrders
                    : item.href === "/admin/reviews"
                      ? pendingReviews
                      : 0;
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[0.87rem] transition"
                      style={{
                        background: active ? "var(--adm-accent-soft)" : "transparent",
                        color: active ? "var(--adm-accent)" : "var(--adm-text)",
                        fontWeight: active ? 500 : 400,
                      }}
                    >
                      <Icon size={16} strokeWidth={1.6} />
                      <span className="flex-1">{item.label}</span>
                      {badge > 0 && (
                        <span
                          className="grid h-5 min-w-5 place-items-center rounded-full px-1 text-[0.62rem] font-semibold"
                          style={{ background: "#8d6a5b", color: "#fff" }}
                        >
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t px-5 py-4 text-sm" style={{ borderColor: "var(--adm-line)" }}>
        {temporaryStorage && (
          <p
            className="mb-3 rounded-lg px-2.5 py-2 text-[0.7rem] leading-snug"
            style={{ background: "#f7efe2", color: "#8a6b3c" }}
          >
            This host can&apos;t save to disk, so changes you make here last only until the server
            restarts.
          </p>
        )}
        <Link href="/" target="_blank" className="flex items-center gap-1 text-xs" style={{ color: "var(--adm-muted)" }}>
          View shop <ExternalLink size={12} strokeWidth={1.7} />
        </Link>
      </div>
    </div>
  );

  return (
    <>
      <div
        className="hidden w-60 shrink-0 border-r lg:block"
        style={{ borderColor: "var(--adm-line)", background: "var(--adm-surface)" }}
      >
        <div className="sticky top-0 h-screen">{nav}</div>
      </div>

      <div
        className="sticky top-0 z-40 flex items-center justify-between border-b px-4 py-3 lg:hidden"
        style={{ borderColor: "var(--adm-line)", background: "var(--adm-surface)" }}
      >
        <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" className="p-1.5">
          <Menu size={20} strokeWidth={1.6} />
        </button>
        <span className="font-serif text-xl" style={{ fontFamily: "var(--font-cormorant), serif" }}>
          {storeName}
        </span>
        <Link href="/" target="_blank" aria-label="View shop" className="p-1.5">
          <ExternalLink size={17} strokeWidth={1.6} />
        </Link>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0"
            style={{ background: "rgba(46,42,38,0.45)" }}
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72" style={{ background: "var(--adm-surface)" }}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-4 p-1.5"
            >
              <X size={19} strokeWidth={1.6} />
            </button>
            {nav}
          </div>
        </div>
      )}
    </>
  );
}
