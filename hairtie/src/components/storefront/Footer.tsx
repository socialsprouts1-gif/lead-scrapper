import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";
import { FacebookIcon, InstagramIcon, PinterestIcon, YoutubeIcon } from "@/components/ui/BrandIcons";
import type { SiteSettings } from "@/lib/settings";
import { NewsletterForm } from "@/components/storefront/NewsletterForm";

export function Footer({ settings }: { settings: SiteSettings }) {
  const socials = [
    { href: settings.social.instagram, icon: InstagramIcon, label: "Instagram" },
    { href: settings.social.facebook, icon: FacebookIcon, label: "Facebook" },
    { href: settings.social.youtube, icon: YoutubeIcon, label: "YouTube" },
    { href: settings.social.pinterest, icon: PinterestIcon, label: "Pinterest" },
  ].filter((s) => s.href);

  return (
    <footer
      className="mt-auto pb-20 md:pb-0"
      style={{ background: "var(--ht-surface)", borderTop: "1px solid var(--ht-border)" }}
    >
      <div className="ht-container grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)] md:gap-8 md:py-16">
        <div className="max-w-sm">
          <p className="font-serif text-2xl">{settings.storeName}</p>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--ht-muted)" }}>
            {settings.footer.about}
          </p>
          {socials.length > 0 && (
            <div className="mt-5 flex items-center gap-3">
              {socials.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={social.label}
                  className="grid h-9 w-9 place-items-center rounded-full transition hover:opacity-70"
                  style={{ border: "1px solid var(--ht-border)" }}
                >
                  <social.icon size={16} />
                </a>
              ))}
            </div>
          )}
        </div>

        {settings.footer.columns.map((column) => (
          <div key={column.title}>
            <p className="ht-eyebrow mb-4">{column.title}</p>
            <ul className="space-y-2.5">
              {column.links.map((link) => (
                <li key={`${column.title}-${link.href}-${link.label}`}>
                  <Link href={link.href} className="text-sm ht-underline" style={{ color: "var(--ht-muted)" }}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="ht-container grid gap-8 border-t py-10 md:grid-cols-2" style={{ borderColor: "var(--ht-border)" }}>
        <div>
          <p className="ht-eyebrow mb-4">Get in touch</p>
          <ul className="space-y-2.5 text-sm" style={{ color: "var(--ht-muted)" }}>
            {settings.contact.phone && (
              <li className="flex items-center gap-2.5">
                <Phone size={15} strokeWidth={1.5} />
                <a href={`tel:${settings.contact.phone.replace(/\s/g, "")}`}>{settings.contact.phone}</a>
              </li>
            )}
            {settings.contact.email && (
              <li className="flex items-center gap-2.5">
                <Mail size={15} strokeWidth={1.5} />
                <a href={`mailto:${settings.contact.email}`}>{settings.contact.email}</a>
              </li>
            )}
            <li className="flex items-start gap-2.5">
              <MapPin size={15} strokeWidth={1.5} className="mt-0.5 shrink-0" />
              <span>
                {settings.store.addressLine1}
                {settings.store.addressLine2 ? `, ${settings.store.addressLine2}` : ""}, {settings.store.city}{" "}
                {settings.store.pincode}
              </span>
            </li>
          </ul>
        </div>
        <div>
          <p className="ht-eyebrow mb-4">Join the list</p>
          <p className="mb-3 text-sm" style={{ color: "var(--ht-muted)" }}>
            New arrivals and small offers, now and then.
          </p>
          <NewsletterForm buttonLabel="Subscribe" />
        </div>
      </div>

      <div
        className="ht-container flex flex-col items-center justify-between gap-3 border-t py-6 text-xs md:flex-row"
        style={{ borderColor: "var(--ht-border)", color: "var(--ht-muted)" }}
      >
        <p>{settings.footer.copyright}</p>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
          <Link href="/privacy-policy" className="ht-underline">Privacy Policy</Link>
          <Link href="/terms" className="ht-underline">Terms &amp; Conditions</Link>
          <Link href="/shipping-returns" className="ht-underline">Shipping &amp; Returns</Link>
        </div>
      </div>
    </footer>
  );
}
