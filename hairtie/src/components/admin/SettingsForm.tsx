"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { updateSiteSettings } from "@/app/actions/admin/settings";
import { ImageField } from "@/components/admin/MediaPicker";
import { useToast } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Spinner";
import type { SiteSettings } from "@/lib/settings";

const TABS = [
  { id: "store", label: "Your shop" },
  { id: "contact", label: "Contact & WhatsApp" },
  { id: "location", label: "Store location" },
  { id: "shipping", label: "Shipping & payment" },
  { id: "seo", label: "SEO & analytics" },
  { id: "menus", label: "Menu & footer" },
] as const;

export function SettingsForm({ initial }: { initial: SiteSettings }) {
  const router = useRouter();
  const { show } = useToast();
  const [values, setValues] = useState<SiteSettings>(initial);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("store");
  const [pending, start] = useTransition();

  function patch(update: Partial<SiteSettings>) {
    setValues((current) => ({ ...current, ...update }));
  }

  function save() {
    start(async () => {
      const result = await updateSiteSettings(values);
      show(result.message ?? "", result.ok ? "default" : "error");
      if (result.ok) router.refresh();
    });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="adm-scroll flex gap-1" role="tablist">
          {TABS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={tab === entry.id}
              onClick={() => setTab(entry.id)}
              className="whitespace-nowrap rounded-lg px-3 py-2 text-sm"
              style={{
                background: tab === entry.id ? "var(--adm-accent-soft)" : "transparent",
                color: tab === entry.id ? "var(--adm-accent)" : "var(--adm-muted)",
                fontWeight: tab === entry.id ? 500 : 400,
              }}
            >
              {entry.label}
            </button>
          ))}
        </div>
        <button type="submit" className="adm-btn adm-btn-primary" disabled={pending}>
          {pending ? <Spinner size={14} /> : null} Save changes
        </button>
      </div>

      {tab === "store" && (
        <div className="adm-card max-w-2xl space-y-5 p-6">
          <Field label="Shop name" hint="Shown in the header, on invoices and in search results.">
            <input className="adm-input" value={values.storeName} onChange={(e) => patch({ storeName: e.target.value })} />
          </Field>
          <Field label="Tagline">
            <input className="adm-input" value={values.tagline} onChange={(e) => patch({ tagline: e.target.value })} />
          </Field>
          <ImageField
            label="Logo"
            value={values.logoUrl ?? ""}
            onChange={(url) => patch({ logoUrl: url || null })}
            hint="A wide PNG with a transparent background works best. Leave empty to show the shop name in text."
          />
          <Field label="Logo width (pixels)">
            <input
              className="adm-input"
              inputMode="numeric"
              value={String(values.logoWidth)}
              onChange={(e) => patch({ logoWidth: Number(e.target.value.replace(/\D/g, "")) || 120 })}
            />
          </Field>

          <div className="border-t pt-5" style={{ borderColor: "var(--adm-line)" }}>
            <h3 className="mb-3 text-base">Announcement bar</h3>
            <label className="mb-3 flex items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={values.announcement.enabled}
                onChange={(e) => patch({ announcement: { ...values.announcement, enabled: e.target.checked } })}
              />
              Show the strip at the very top of the site
            </label>
            <Field label="Message">
              <input
                className="adm-input"
                value={values.announcement.text}
                onChange={(e) => patch({ announcement: { ...values.announcement, text: e.target.value } })}
              />
            </Field>
            <Field label="Links to">
              <input
                className="adm-input"
                value={values.announcement.link}
                onChange={(e) => patch({ announcement: { ...values.announcement, link: e.target.value } })}
                placeholder="/shop"
              />
            </Field>
          </div>
        </div>
      )}

      {tab === "contact" && (
        <div className="adm-card max-w-2xl space-y-5 p-6">
          <Field label="WhatsApp number" hint="Digits only, with the country code — for example 919876543210. This powers every WhatsApp button on the site.">
            <input
              className="adm-input"
              value={values.contact.whatsapp}
              onChange={(e) => patch({ contact: { ...values.contact, whatsapp: e.target.value.replace(/\D/g, "") } })}
              inputMode="numeric"
              placeholder="919876543210"
            />
          </Field>
          <Field label="Phone number">
            <input
              className="adm-input"
              value={values.contact.phone}
              onChange={(e) => patch({ contact: { ...values.contact, phone: e.target.value } })}
            />
          </Field>
          <Field label="Email address">
            <input
              className="adm-input"
              type="email"
              value={values.contact.email}
              onChange={(e) => patch({ contact: { ...values.contact, email: e.target.value } })}
            />
          </Field>

          <div className="border-t pt-5" style={{ borderColor: "var(--adm-line)" }}>
            <h3 className="mb-3 text-base">Social profiles</h3>
            {(["instagram", "facebook", "youtube", "pinterest"] as const).map((key) => (
              <div key={key} className="mb-3">
                <Field label={key[0].toUpperCase() + key.slice(1)}>
                  <input
                    className="adm-input"
                    value={values.social[key]}
                    onChange={(e) => patch({ social: { ...values.social, [key]: e.target.value } })}
                    placeholder="https://…"
                  />
                </Field>
              </div>
            ))}
            <p className="adm-hint">Leave a field empty to hide that icon in the footer.</p>
          </div>
        </div>
      )}

      {tab === "location" && (
        <div className="adm-card max-w-2xl space-y-5 p-6">
          <Field label="Store name">
            <input className="adm-input" value={values.store.name} onChange={(e) => patch({ store: { ...values.store, name: e.target.value } })} />
          </Field>
          <Field label="Address line 1">
            <input className="adm-input" value={values.store.addressLine1} onChange={(e) => patch({ store: { ...values.store, addressLine1: e.target.value } })} />
          </Field>
          <Field label="Address line 2">
            <input className="adm-input" value={values.store.addressLine2} onChange={(e) => patch({ store: { ...values.store, addressLine2: e.target.value } })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="City">
              <input className="adm-input" value={values.store.city} onChange={(e) => patch({ store: { ...values.store, city: e.target.value } })} />
            </Field>
            <Field label="State">
              <input className="adm-input" value={values.store.state} onChange={(e) => patch({ store: { ...values.store, state: e.target.value } })} />
            </Field>
            <Field label="Pincode">
              <input className="adm-input" value={values.store.pincode} onChange={(e) => patch({ store: { ...values.store, pincode: e.target.value } })} />
            </Field>
          </div>
          <Field label="Opening hours" hint="One line per row — it appears exactly as you type it.">
            <textarea rows={3} className="adm-input" value={values.store.hours} onChange={(e) => patch({ store: { ...values.store, hours: e.target.value } })} />
          </Field>
          <Field label="Google Maps link" hint="The link people get when they tap Get Directions.">
            <input className="adm-input" value={values.store.mapsUrl} onChange={(e) => patch({ store: { ...values.store, mapsUrl: e.target.value } })} placeholder="https://maps.google.com/…" />
          </Field>
          <Field label="Google Maps embed link" hint="Optional. In Google Maps choose Share → Embed a map, and paste the src link from the code. Leave empty to show your store photo instead.">
            <input className="adm-input" value={values.store.mapsEmbedUrl} onChange={(e) => patch({ store: { ...values.store, mapsEmbedUrl: e.target.value } })} placeholder="https://www.google.com/maps/embed?pb=…" />
          </Field>
          <ImageField
            label="Store photo"
            value={values.store.imageUrl}
            onChange={(url) => patch({ store: { ...values.store, imageUrl: url } })}
          />
        </div>
      )}

      {tab === "shipping" && (
        <div className="adm-card max-w-2xl space-y-5 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Shipping charge (₹)" hint="Charged when the order is below the free-shipping amount.">
              <input
                className="adm-input"
                inputMode="decimal"
                value={String(values.shipping.flatRatePaise / 100)}
                onChange={(e) => patch({ shipping: { ...values.shipping, flatRatePaise: Math.round(Number(e.target.value || 0) * 100) } })}
              />
            </Field>
            <Field label="Free shipping above (₹)" hint="Set to 0 to always charge shipping.">
              <input
                className="adm-input"
                inputMode="decimal"
                value={String(values.shipping.freeAbovePaise / 100)}
                onChange={(e) => patch({ shipping: { ...values.shipping, freeAbovePaise: Math.round(Number(e.target.value || 0) * 100) } })}
              />
            </Field>
          </div>

          <Field label="Dispatch note" hint="Shown on product pages and at checkout.">
            <input
              className="adm-input"
              value={values.shipping.dispatchNote}
              onChange={(e) => patch({ shipping: { ...values.shipping, dispatchNote: e.target.value } })}
            />
          </Field>

          <div className="space-y-3 border-t pt-5" style={{ borderColor: "var(--adm-line)" }}>
            <h3 className="text-base">Payment options</h3>
            <label className="flex items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={values.shipping.codEnabled}
                onChange={(e) => patch({ shipping: { ...values.shipping, codEnabled: e.target.checked } })}
              />
              Offer Cash on Delivery
            </label>
            <label className="flex items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={values.shipping.onlinePaymentEnabled}
                onChange={(e) => patch({ shipping: { ...values.shipping, onlinePaymentEnabled: e.target.checked } })}
              />
              Offer online payment (UPI, cards, net banking)
            </label>
            <p className="adm-hint">
              Online payment also needs your Razorpay keys set as environment variables on the server. Until
              they are, the option stays hidden at checkout even when it is ticked here.
            </p>
          </div>
        </div>
      )}

      {tab === "seo" && (
        <div className="adm-card max-w-2xl space-y-5 p-6">
          <Field label="Website address" hint="For example https://hairtie.in — used for sitemaps and links shared on social media.">
            <input className="adm-input" value={values.seo.siteUrl} onChange={(e) => patch({ seo: { ...values.seo, siteUrl: e.target.value } })} placeholder="https://hairtie.in" />
          </Field>
          <Field label="Homepage title" hint="What Google shows as the heading for your homepage.">
            <input className="adm-input" value={values.seo.siteTitle} onChange={(e) => patch({ seo: { ...values.seo, siteTitle: e.target.value } })} />
          </Field>
          <Field label="Homepage description" hint="Around 150 characters works best.">
            <textarea rows={3} className="adm-input" value={values.seo.description} onChange={(e) => patch({ seo: { ...values.seo, description: e.target.value } })} />
          </Field>
          <Field label="Keywords">
            <input className="adm-input" value={values.seo.keywords} onChange={(e) => patch({ seo: { ...values.seo, keywords: e.target.value } })} />
          </Field>
          <ImageField
            label="Sharing image"
            value={values.seo.ogImageUrl}
            onChange={(url) => patch({ seo: { ...values.seo, ogImageUrl: url } })}
            hint="Shown when someone shares your site on WhatsApp or Instagram. 1200 × 630 pixels is ideal."
          />

          <div className="border-t pt-5" style={{ borderColor: "var(--adm-line)" }}>
            <h3 className="mb-3 text-base">Analytics</h3>
            <Field label="Google Analytics ID" hint="Looks like G-XXXXXXX. Leave empty to load no tracking at all.">
              <input className="adm-input" value={values.analytics.googleAnalyticsId} onChange={(e) => patch({ analytics: { ...values.analytics, googleAnalyticsId: e.target.value.trim() } })} placeholder="G-XXXXXXXXXX" />
            </Field>
          </div>
        </div>
      )}

      {tab === "menus" && (
        <div className="space-y-5">
          <div className="adm-card max-w-3xl p-6">
            <h3 className="mb-1 text-base">Header menu</h3>
            <p className="mb-4 text-sm" style={{ color: "var(--adm-muted)" }}>
              The links across the top of your shop.
            </p>
            <LinkRows
              links={values.header.menu}
              onChange={(menu) => patch({ header: { ...values.header, menu } })}
            />

            <div className="mt-5 space-y-2 border-t pt-4" style={{ borderColor: "var(--adm-line)" }}>
              {([
                ["showSearch", "Show the search icon"],
                ["showWishlist", "Show the wishlist icon"],
                ["showAccount", "Show the account icon"],
                ["showCart", "Show the bag icon"],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2.5 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={values.header[key]}
                    onChange={(e) => patch({ header: { ...values.header, [key]: e.target.checked } })}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className="adm-card max-w-3xl p-6">
            <h3 className="mb-1 text-base">Footer</h3>
            <Field label="About text">
              <textarea
                rows={3}
                className="adm-input"
                value={values.footer.about}
                onChange={(e) => patch({ footer: { ...values.footer, about: e.target.value } })}
              />
            </Field>

            <div className="mt-5 space-y-6">
              {values.footer.columns.map((column, index) => (
                <div key={index} className="rounded-xl p-4" style={{ background: "var(--adm-bg)" }}>
                  <div className="mb-3 flex items-center gap-2">
                    <label className="sr-only" htmlFor={`footer-col-${index}`}>Column title</label>
                    <input
                      id={`footer-col-${index}`}
                      className="adm-input"
                      style={{ maxWidth: "14rem" }}
                      value={column.title}
                      onChange={(e) => {
                        const columns = [...values.footer.columns];
                        columns[index] = { ...columns[index], title: e.target.value };
                        patch({ footer: { ...values.footer, columns } });
                      }}
                    />
                    <button
                      type="button"
                      className="rounded-md p-2"
                      aria-label={`Remove column ${column.title}`}
                      style={{ color: "#9c3a3a" }}
                      onClick={() =>
                        patch({
                          footer: {
                            ...values.footer,
                            columns: values.footer.columns.filter((_, i) => i !== index),
                          },
                        })
                      }
                    >
                      <Trash2 size={15} strokeWidth={1.7} />
                    </button>
                  </div>
                  <LinkRows
                    links={column.links}
                    onChange={(links) => {
                      const columns = [...values.footer.columns];
                      columns[index] = { ...columns[index], links };
                      patch({ footer: { ...values.footer, columns } });
                    }}
                  />
                </div>
              ))}
            </div>

            <button
              type="button"
              className="adm-btn adm-btn-ghost adm-btn-sm mt-4"
              onClick={() =>
                patch({
                  footer: {
                    ...values.footer,
                    columns: [...values.footer.columns, { title: "New column", links: [] }],
                  },
                })
              }
            >
              <Plus size={14} strokeWidth={1.8} /> Add a footer column
            </button>

            <div className="mt-5">
              <Field label="Copyright line">
                <input
                  className="adm-input"
                  value={values.footer.copyright}
                  onChange={(e) => patch({ footer: { ...values.footer, copyright: e.target.value } })}
                />
              </Field>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6">
        <button type="submit" className="adm-btn adm-btn-primary" disabled={pending}>
          {pending ? <Spinner size={14} /> : null} Save changes
        </button>
      </div>
    </form>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="adm-label">{label}</span>
      {children}
      {hint && <span className="adm-hint block">{hint}</span>}
    </label>
  );
}

function LinkRows({
  links,
  onChange,
}: {
  links: { label: string; href: string }[];
  onChange: (links: { label: string; href: string }[]) => void;
}) {
  return (
    <div className="space-y-2">
      {links.map((link, index) => (
        <div key={index} className="flex gap-2">
          <label className="sr-only" htmlFor={`link-label-${index}-${link.href}`}>Link text</label>
          <input
            id={`link-label-${index}-${link.href}`}
            className="adm-input"
            style={{ maxWidth: "12rem" }}
            value={link.label}
            placeholder="Link text"
            onChange={(event) => {
              const next = [...links];
              next[index] = { ...next[index], label: event.target.value };
              onChange(next);
            }}
          />
          <label className="sr-only" htmlFor={`link-href-${index}-${link.href}`}>Link address</label>
          <input
            id={`link-href-${index}-${link.href}`}
            className="adm-input"
            value={link.href}
            placeholder="/shop"
            onChange={(event) => {
              const next = [...links];
              next[index] = { ...next[index], href: event.target.value };
              onChange(next);
            }}
          />
          <button
            type="button"
            className="shrink-0 rounded-md p-2"
            aria-label={`Remove link ${link.label}`}
            style={{ color: "#9c3a3a" }}
            onClick={() => onChange(links.filter((_, i) => i !== index))}
          >
            <Trash2 size={15} strokeWidth={1.7} />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="adm-btn adm-btn-ghost adm-btn-sm"
        onClick={() => onChange([...links, { label: "", href: "/" }])}
      >
        <Plus size={14} strokeWidth={1.8} /> Add a link
      </button>
    </div>
  );
}
