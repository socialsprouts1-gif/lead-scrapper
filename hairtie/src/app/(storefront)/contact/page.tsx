import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { getPublishedPage } from "@/lib/pages";
import { getSiteSettings } from "@/lib/settings";
import { buildMetadata, resolveSiteUrl } from "@/lib/seo";
import { getWishlistIds } from "@/lib/wishlist";
import { SectionList } from "@/components/sections/SectionRenderer";
import { ContactForm } from "@/components/storefront/ContactForm";

export async function generateMetadata(): Promise<Metadata> {
  const settings = getSiteSettings();
  const page = getPublishedPage("contact");
  const siteUrl = await resolveSiteUrl(settings);
  return buildMetadata({
    settings,
    siteUrl,
    title: page?.page.seoTitle || "Contact Hairtie",
    description: page?.page.seoDescription || "Message Hairtie on WhatsApp, email us or visit our store.",
    path: "/contact",
  });
}

export default async function ContactPage() {
  const page = getPublishedPage("contact");
  const settings = getSiteSettings();
  const wishlist = await getWishlistIds();

  return (
    <>
      {page && <SectionList sections={page.sections} context={{ settings, wishlist }} />}

      <div className="ht-container grid gap-10 pb-16 md:grid-cols-2 md:gap-16">
        <div>
          <ContactForm whatsapp={settings.contact.whatsapp} email={settings.contact.email} />
        </div>

        <div className="space-y-8">
          <div>
            <p className="ht-eyebrow mb-3">Reach us directly</p>
            <ul className="space-y-4 text-sm">
              {settings.contact.phone && (
                <li className="flex gap-3">
                  <Phone size={17} strokeWidth={1.5} className="mt-0.5 shrink-0" style={{ color: "var(--ht-primary)" }} />
                  <a href={`tel:${settings.contact.phone.replace(/\s/g, "")}`} className="ht-underline">
                    {settings.contact.phone}
                  </a>
                </li>
              )}
              {settings.contact.email && (
                <li className="flex gap-3">
                  <Mail size={17} strokeWidth={1.5} className="mt-0.5 shrink-0" style={{ color: "var(--ht-primary)" }} />
                  <a href={`mailto:${settings.contact.email}`} className="ht-underline">
                    {settings.contact.email}
                  </a>
                </li>
              )}
              <li className="flex gap-3">
                <MapPin size={17} strokeWidth={1.5} className="mt-0.5 shrink-0" style={{ color: "var(--ht-primary)" }} />
                <address className="not-italic" style={{ color: "var(--ht-muted)" }}>
                  {settings.store.name}<br />
                  {settings.store.addressLine1}
                  {settings.store.addressLine2 ? <>, {settings.store.addressLine2}</> : null}<br />
                  {settings.store.city}, {settings.store.state} {settings.store.pincode}
                </address>
              </li>
              {settings.store.hours && (
                <li className="flex gap-3">
                  <Clock size={17} strokeWidth={1.5} className="mt-0.5 shrink-0" style={{ color: "var(--ht-primary)" }} />
                  <span className="whitespace-pre-line" style={{ color: "var(--ht-muted)" }}>
                    {settings.store.hours}
                  </span>
                </li>
              )}
            </ul>
          </div>

          {settings.store.mapsUrl && (
            <a href={settings.store.mapsUrl} target="_blank" rel="noreferrer noopener" className="ht-btn ht-btn-outline">
              Get directions
            </a>
          )}
        </div>
      </div>
    </>
  );
}
