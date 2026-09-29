"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Grid2x2, Heart, Home, ShoppingBag, Store } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { label: "Home", href: "/", icon: Home },
  { label: "Shop", href: "/shop", icon: Store },
  { label: "Categories", href: "/categories", icon: Grid2x2 },
  { label: "Wishlist", href: "/wishlist", icon: Heart },
  { label: "Bag", href: "/cart", icon: ShoppingBag },
];

export function MobileNav({ cartCount, wishlistCount }: { cartCount: number; wishlistCount: number }) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 md:hidden"
      style={{
        background: "color-mix(in srgb, var(--ht-bg) 94%, transparent)",
        backdropFilter: "blur(12px)",
        borderTop: "1px solid var(--ht-border)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      aria-label="Mobile navigation"
    >
      <ul className="flex items-stretch">
        {ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const badge = item.href === "/cart" ? cartCount : item.href === "/wishlist" ? wishlistCount : 0;
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn("relative flex flex-col items-center gap-1 py-2.5 text-[0.62rem] tracking-wide transition")}
                style={{ color: active ? "var(--ht-text)" : "var(--ht-muted)" }}
              >
                <span className="relative">
                  <Icon size={19} strokeWidth={active ? 1.9 : 1.5} />
                  {badge > 0 && (
                    <span
                      className="absolute -right-2 -top-1.5 grid h-[15px] min-w-[15px] place-items-center rounded-full px-1 text-[0.55rem] font-semibold"
                      style={{ background: "var(--ht-primary)", color: "#fff" }}
                    >
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
