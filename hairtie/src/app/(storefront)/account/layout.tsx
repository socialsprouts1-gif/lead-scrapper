import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { LogoutButton } from "@/components/storefront/AuthForms";

const LINKS = [
  { href: "/account", label: "Overview" },
  { href: "/account/orders", label: "My orders" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/wishlist", label: "Wishlist" },
];

export default async function AccountLayout({ children }: LayoutProps<"/account">) {
  const user = await requireUser();

  return (
    <div className="ht-container py-10 md:py-14">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="ht-eyebrow">My account</p>
          <h1 className="mt-1 text-[2rem] md:text-[2.4rem]">Hello, {user.name.split(" ")[0]}</h1>
        </div>
        <LogoutButton />
      </div>

      <div className="grid gap-10 lg:grid-cols-[13rem_1fr] lg:gap-14">
        <nav aria-label="Account" className="ht-scroll-x -mx-5 px-5 lg:mx-0 lg:block lg:px-0">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block whitespace-nowrap rounded-full px-4 py-2 text-sm lg:rounded-none lg:border-b lg:px-0 lg:py-3"
              style={{ borderColor: "var(--ht-border)" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div>{children}</div>
      </div>
    </div>
  );
}
