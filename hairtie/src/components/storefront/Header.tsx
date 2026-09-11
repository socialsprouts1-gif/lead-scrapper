"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Heart, Menu, Search, ShoppingBag, User, X, ChevronDown } from "lucide-react";
import type { SiteSettings } from "@/lib/settings";

type NavCategory = { name: string; slug: string; children: { name: string; slug: string }[] };

export function Header({
  settings,
  categories,
  cartCount,
  wishlistCount,
  signedIn,
}: {
  settings: SiteSettings;
  categories: NavCategory[];
  cartCount: number;
  wishlistCount: number;
  signedIn: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);

  // React's "adjust state when a prop changes" pattern: closing the menus on
  // navigation, without an effect that would cause a second render pass.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMenuOpen(false);
    setSearchOpen(false);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get("q");
    const query = typeof value === "string" ? value.trim() : "";
    setSearchOpen(false);
    router.push(query ? `/shop?q=${encodeURIComponent(query)}` : "/shop");
  }

  return (
    <>
      {settings.announcement.enabled && settings.announcement.text && (
        <Link
          href={settings.announcement.link || "/shop"}
          className="block px-4 py-2 text-center text-[0.72rem] tracking-[0.14em] uppercase"
          style={{ background: "var(--ht-text)", color: "var(--ht-bg)" }}
        >
          {settings.announcement.text}
        </Link>
      )}

      <header
        className="sticky top-0 z-50 transition-shadow"
        style={{
          background: "color-mix(in srgb, var(--ht-bg) 92%, transparent)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid var(--ht-border)",
          boxShadow: scrolled ? "0 8px 24px -20px rgba(47,41,37,0.55)" : "none",
        }}
      >
        <div className="ht-container flex h-16 items-center justify-between gap-4 md:h-20">
          <button
            type="button"
            className="-ml-2 p-2 lg:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={20} strokeWidth={1.5} />
          </button>

          <Link href="/" className="flex items-center gap-2" aria-label={`${settings.storeName} home`}>
            {settings.logoUrl ? (
              <Image
                src={settings.logoUrl}
                alt={settings.storeName}
                width={settings.logoWidth}
                height={40}
                priority
                className="h-8 w-auto object-contain md:h-9"
              />
            ) : (
              <span
                className="font-serif text-2xl leading-none md:text-[1.7rem]"
                style={{ letterSpacing: "0.01em" }}
              >
                {settings.storeName}
              </span>
            )}
          </Link>

          <nav className="hidden items-center gap-7 lg:flex" aria-label="Main">
            {settings.header.menu.map((item) => {
              const group = categories.find((c) => `/categories/${c.slug}` === item.href);
              if (group && group.children.length > 0) {
                return (
                  <div
                    key={item.href}
                    className="relative"
                    onMouseEnter={() => setOpenGroup(group.slug)}
                    onMouseLeave={() => setOpenGroup(null)}
                  >
                    <Link
                      href={item.href}
                      className="flex items-center gap-1 py-2 text-[0.8rem] uppercase tracking-[0.13em]"
                    >
                      {item.label}
                      <ChevronDown size={13} strokeWidth={1.6} />
                    </Link>
                    {openGroup === group.slug && (
                      <div
                        className="absolute left-1/2 top-full w-56 -translate-x-1/2 overflow-hidden pt-2"
                      >
                        <div
                          className="ht-card overflow-hidden py-2"
                          style={{ boxShadow: "0 24px 50px -30px rgba(47,41,37,0.5)" }}
                        >
                          {group.children.map((child) => (
                            <Link
                              key={child.slug}
                              href={`/categories/${child.slug}`}
                              className="block px-4 py-2 text-sm transition hover:opacity-60"
                            >
                              {child.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }
              return (
                <Link
                  key={`${item.href}-${item.label}`}
                  href={item.href}
                  className="py-2 text-[0.8rem] uppercase tracking-[0.13em] ht-underline"
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1 md:gap-2">
            {settings.header.showSearch && (
              <button
                type="button"
                onClick={() => setSearchOpen((v) => !v)}
                className="p-2"
                aria-label="Search products"
                aria-expanded={searchOpen}
              >
                <Search size={19} strokeWidth={1.5} />
              </button>
            )}
            {settings.header.showAccount && (
              <Link
                href={signedIn ? "/account" : "/account/login"}
                className="hidden p-2 md:block"
                aria-label={signedIn ? "Your account" : "Sign in"}
              >
                <User size={19} strokeWidth={1.5} />
              </Link>
            )}
            {settings.header.showWishlist && (
              <Link href="/wishlist" className="relative hidden p-2 md:block" aria-label="Wishlist">
                <Heart size={19} strokeWidth={1.5} />
                {wishlistCount > 0 && <Count value={wishlistCount} />}
              </Link>
            )}
            {settings.header.showCart && (
              <Link href="/cart" className="relative p-2" aria-label={`Bag, ${cartCount} items`}>
                <ShoppingBag size={19} strokeWidth={1.5} />
                {cartCount > 0 && <Count value={cartCount} />}
              </Link>
            )}
          </div>
        </div>

        {searchOpen && (
          <div className="border-t" style={{ borderColor: "var(--ht-border)" }}>
            <form onSubmit={submitSearch} className="ht-container flex items-center gap-3 py-4">
              <Search size={18} strokeWidth={1.5} style={{ color: "var(--ht-muted)" }} />
              <input
                ref={searchRef}
                name="q"
                type="search"
                placeholder="Search claw clips, totes, scrunchies…"
                className="w-full bg-transparent text-base outline-none"
                aria-label="Search products"
              />
              <button type="submit" className="ht-btn ht-btn-primary ht-btn-sm">
                Search
              </button>
            </form>
          </div>
        )}
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0"
            style={{ background: "rgba(47,41,37,0.45)" }}
            onClick={() => setMenuOpen(false)}
          />
          <div
            className="absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col overflow-y-auto"
            style={{ background: "var(--ht-bg)" }}
          >
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--ht-border)" }}>
              <span className="font-serif text-xl">{settings.storeName}</span>
              <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu" className="p-2">
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>

            <nav className="flex-1 px-5 py-4" aria-label="Mobile">
              <Link href="/shop" className="block py-3 text-lg">
                Shop All
              </Link>
              {categories.map((category) => (
                <details key={category.slug} className="border-t" style={{ borderColor: "var(--ht-border)" }}>
                  <summary className="flex cursor-pointer list-none items-center justify-between py-3 text-lg">
                    {category.name}
                    <ChevronDown size={16} strokeWidth={1.6} />
                  </summary>
                  <div className="pb-3 pl-3">
                    <Link href={`/categories/${category.slug}`} className="block py-1.5 text-sm" style={{ color: "var(--ht-muted)" }}>
                      All {category.name}
                    </Link>
                    {category.children.map((child) => (
                      <Link key={child.slug} href={`/categories/${child.slug}`} className="block py-1.5 text-sm">
                        {child.name}
                      </Link>
                    ))}
                  </div>
                </details>
              ))}
              <div className="mt-2 border-t pt-2" style={{ borderColor: "var(--ht-border)" }}>
                {[
                  { label: "About Hairtie", href: "/about" },
                  { label: "Visit Our Store", href: "/store" },
                  { label: "Track Order", href: "/track-order" },
                  { label: "Contact", href: "/contact" },
                  { label: signedIn ? "My Account" : "Sign In", href: signedIn ? "/account" : "/account/login" },
                ].map((link) => (
                  <Link key={link.href} href={link.href} className="block py-2.5 text-base">
                    {link.label}
                  </Link>
                ))}
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}

function Count({ value }: { value: number }) {
  return (
    <span
      className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[0.6rem] font-semibold"
      style={{ background: "var(--ht-primary)", color: "#fff" }}
    >
      {value > 99 ? "99+" : value}
    </span>
  );
}
