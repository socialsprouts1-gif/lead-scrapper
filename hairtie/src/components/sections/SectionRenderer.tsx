import Image from "next/image";
import Link from "next/link";
import { ChevronDown, MapPin, Clock, Phone } from "lucide-react";
import { allCategories, productsByIds, productsForSection } from "@/lib/catalog";
import { activeLooks } from "@/lib/looks";
import { withDefaults } from "@/lib/sections";
import { formatPaise } from "@/lib/money";
import { whatsappLink } from "@/lib/whatsapp";
import type { SiteSettings } from "@/lib/settings";
import { SectionHeading } from "@/components/sections/SectionHeading";
import { ProductCarouselBlock, ProductGridBlock, ProductChip } from "@/components/sections/ProductRow";
import { NewsletterForm } from "@/components/storefront/NewsletterForm";
import { Stars } from "@/components/ui/Stars";
import { InstagramIcon, WhatsappIcon } from "@/components/ui/BrandIcons";

export type SectionData = {
  id: string;
  type: string;
  isHidden: boolean;
  settings: unknown;
};

export type RenderContext = {
  settings: SiteSettings;
  wishlist: string[];
};

function str(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}
function num(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
/**
 * Reads a repeater setting. Blocks the admin has hidden in the editor stay in
 * the draft but are dropped here, so hiding a block never loses its content.
 */
function list(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return (value as Record<string, unknown>[]).filter((item) => item?._hidden !== true);
}

/** Renders a full page of blocks. */
export function SectionList({
  sections,
  context,
}: {
  sections: SectionData[];
  context: RenderContext;
}) {
  const visible = sections.filter((section) => !section.isHidden);
  return (
    <>
      {visible.map((section) => (
        <SectionBlock key={section.id} section={section} context={context} />
      ))}
    </>
  );
}

export function SectionBlock({
  section,
  context,
}: {
  section: SectionData;
  context: RenderContext;
}) {
  const s = withDefaults(section.type, section.settings);

  switch (section.type) {
    case "hero":
      return <Hero s={s} />;
    case "productGrid":
      return <ProductGridSection s={s} context={context} />;
    case "productCarousel":
      return <ProductCarouselSection s={s} context={context} />;
    case "categoryGrid":
      return <CategoryGridSection s={s} />;
    case "promoBanner":
      return <PromoBanner s={s} />;
    case "imageText":
      return <ImageText s={s} />;
    case "shopTheLook":
      return <ShopTheLook s={s} />;
    case "usps":
      return <Usps s={s} />;
    case "instagram":
      return <InstagramGrid s={s} />;
    case "testimonials":
      return <Testimonials s={s} />;
    case "storeLocation":
      return <StoreLocation s={s} settings={context.settings} />;
    case "whatsappCta":
      return <WhatsappCta s={s} settings={context.settings} />;
    case "faq":
      return <Faq s={s} />;
    case "newsletter":
      return <Newsletter s={s} />;
    case "video":
      return <VideoBlock s={s} />;
    case "textSection":
      return <TextSection s={s} />;
    case "customImage":
      return <CustomImage s={s} />;
    case "columns":
      return <FeatureColumns s={s} />;
    case "gallery":
      return <Gallery s={s} />;
    case "announcement":
      return <AnnouncementStrip s={s} />;
    case "spacer":
      return <div style={{ height: `${num(s.height, 48)}px` }} aria-hidden />;
    default:
      return null;
  }
}

/* -------------------------------------------------------------------------- */

type S = Record<string, unknown>;

function Hero({ s }: { s: S }) {
  const heights = { short: "min(58vh, 480px)", medium: "min(72vh, 640px)", tall: "min(86vh, 780px)" };
  const height = heights[str(s.height, "tall") as keyof typeof heights] ?? heights.tall;
  const align = str(s.align, "left");
  const image = str(s.imageUrl) || "/images/hero/hero-main.webp";
  const mobileImage = str(s.mobileImageUrl);
  const hasDistinctMobile = Boolean(mobileImage) && mobileImage !== image;
  const alignClass =
    align === "center" ? "items-center text-center" : align === "right" ? "items-end text-right" : "items-start";

  return (
    <section className="relative w-full overflow-hidden" style={{ minHeight: height }}>
      {hasDistinctMobile ? (
        <>
          <Image src={mobileImage} alt="" fill priority sizes="100vw" className="object-cover md:hidden" aria-hidden />
          <Image src={image} alt="" fill priority sizes="100vw" className="hidden object-cover md:block" aria-hidden />
        </>
      ) : (
        <Image src={image} alt="" fill priority sizes="100vw" className="object-cover" aria-hidden />
      )}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to ${align === "right" ? "left" : "right"}, rgba(30,25,22,${
            num(s.overlay, 25) / 100
          }), rgba(30,25,22,${Math.max(num(s.overlay, 25) / 100 - 0.18, 0)}) 60%)`,
        }}
      />
      <div className="ht-container relative flex" style={{ minHeight: height }}>
        <div className={`flex w-full flex-col justify-center py-16 ${alignClass}`}>
          <div className="ht-fade-up max-w-xl" style={{ color: "#fff" }}>
            {str(s.eyebrow) && (
              <p className="ht-eyebrow mb-4" style={{ color: "rgba(255,255,255,0.82)" }}>
                {str(s.eyebrow)}
              </p>
            )}
            <h1 className="text-[2.6rem] leading-[1.05] md:text-[4rem]">{str(s.heading)}</h1>
            {str(s.subheading) && (
              <p className="mt-5 max-w-lg text-[1rem] leading-relaxed md:text-[1.08rem]" style={{ color: "rgba(255,255,255,0.9)" }}>
                {str(s.subheading)}
              </p>
            )}
            <div className={`mt-8 flex flex-wrap gap-3 ${align === "center" ? "justify-center" : ""}`}>
              {str(s.primaryLabel) && (
                <Link
                  href={str(s.primaryHref, "/shop")}
                  className="ht-btn"
                  style={{ background: "#fff", color: "#2f2925" }}
                >
                  {str(s.primaryLabel)}
                </Link>
              )}
              {str(s.secondaryLabel) && (
                <Link
                  href={str(s.secondaryHref, "/categories")}
                  className="ht-btn"
                  style={{ border: "1px solid rgba(255,255,255,0.7)", color: "#fff" }}
                >
                  {str(s.secondaryLabel)}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductGridSection({ s, context }: { s: S; context: RenderContext }) {
  const products = productsForSection(s);
  if (products.length === 0) return null;
  return (
    <section className="ht-section">
      <div className="ht-container">
        <SectionHeading
          heading={str(s.heading)}
          subheading={str(s.subheading)}
          linkLabel={str(s.viewAllLabel)}
          linkHref={str(s.viewAllHref)}
          align="left"
        />
        <ProductGridBlock products={products} columns={num(s.columns, 4)} wishlist={context.wishlist} />
      </div>
    </section>
  );
}

function ProductCarouselSection({ s, context }: { s: S; context: RenderContext }) {
  const products = productsForSection(s);
  if (products.length === 0) return null;
  return (
    <section className="ht-section">
      <div className="ht-container">
        <SectionHeading
          heading={str(s.heading)}
          subheading={str(s.subheading)}
          linkLabel={str(s.viewAllLabel)}
          linkHref={str(s.viewAllHref)}
          align="left"
        />
        <ProductCarouselBlock products={products} wishlist={context.wishlist} />
      </div>
    </section>
  );
}

function CategoryGridSection({ s }: { s: S }) {
  const categories = allCategories()
    .filter((category) => category.isActive && (!s.featuredOnly || category.isFeatured))
    .slice(0, Math.min(num(s.limit, 8), 16));
  if (categories.length === 0) return null;

  const circle = str(s.style, "card") === "circle";

  return (
    <section className="ht-section" style={{ background: "var(--ht-surface)" }}>
      <div className="ht-container">
        <SectionHeading heading={str(s.heading)} subheading={str(s.subheading)} />
        <div
          className={
            circle
              ? "ht-scroll-x -mx-5 px-5 md:mx-0 md:grid md:grid-cols-6 md:gap-6 md:overflow-visible md:px-0"
              : "grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5"
          }
        >
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/categories/${category.slug}`}
              className="group block"
            >
              <div
                className="relative overflow-hidden"
                style={{
                  borderRadius: circle ? "999px" : "var(--ht-radius)",
                  aspectRatio: circle ? "1 / 1" : "4 / 5",
                  width: circle ? "min(34vw, 9rem)" : undefined,
                  background: "var(--ht-bg)",
                }}
              >
                {category.imageUrl && (
                  <Image
                    src={category.imageUrl}
                    alt={category.imageAlt || category.name}
                    fill
                    loading="lazy"
                    sizes={circle ? "160px" : "(max-width: 768px) 50vw, 25vw"}
                    className="object-cover transition duration-700 group-hover:scale-[1.06]"
                  />
                )}
                {!circle && (
                  <>
                    <div
                      className="absolute inset-0"
                      style={{ background: "linear-gradient(to top, rgba(38,32,28,0.55), transparent 55%)" }}
                    />
                    <span className="absolute inset-x-4 bottom-4 font-serif text-lg leading-tight text-white md:text-xl">
                      {category.name}
                    </span>
                  </>
                )}
              </div>
              {circle && (
                <p className="mt-3 text-center text-[0.82rem]" style={{ width: "min(34vw, 9rem)" }}>
                  {category.name}
                </p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function PromoBanner({ s }: { s: S }) {
  const full = str(s.layout, "split") === "full";
  const image = str(s.imageUrl) || "/images/banners/promo-wide.webp";

  if (full) {
    return (
      <section className="ht-section">
        <div className="ht-container">
          <div className="relative overflow-hidden" style={{ borderRadius: "var(--ht-radius)", aspectRatio: "16 / 7" }}>
            <Image src={image} alt="" fill loading="lazy" sizes="100vw" className="object-cover" aria-hidden />
            <div className="absolute inset-0" style={{ background: "rgba(35,29,25,0.32)" }} />
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center" style={{ color: "#fff" }}>
              <h2 className="max-w-2xl text-[1.8rem] md:text-[3rem]">{str(s.heading)}</h2>
              {str(s.body) && <p className="mt-3 max-w-lg text-sm md:text-base">{str(s.body)}</p>}
              {str(s.buttonLabel) && (
                <Link href={str(s.buttonHref, "/shop")} className="ht-btn mt-6" style={{ background: "#fff", color: "#2f2925" }}>
                  {str(s.buttonLabel)}
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="ht-section">
      <div className="ht-container">
        <div
          className="grid items-stretch overflow-hidden md:grid-cols-2"
          style={{ borderRadius: "var(--ht-radius)", background: "var(--ht-secondary)" }}
        >
          <div className="relative min-h-[240px] md:min-h-[380px]">
            <Image src={image} alt="" fill loading="lazy" sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" aria-hidden />
          </div>
          <div className="flex flex-col justify-center gap-4 p-8 md:p-14">
            <h2 className="text-[1.7rem] md:text-[2.4rem]">{str(s.heading)}</h2>
            {str(s.body) && <p className="max-w-md text-[0.98rem] leading-relaxed">{str(s.body)}</p>}
            {str(s.buttonLabel) && (
              <Link href={str(s.buttonHref, "/shop")} className="ht-btn ht-btn-primary mt-2 self-start">
                {str(s.buttonLabel)}
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ImageText({ s }: { s: S }) {
  const imageFirst = str(s.imagePosition, "left") === "left";
  const image = str(s.imageUrl) || "/images/lifestyle/lifestyle-1.webp";

  return (
    <section className="ht-section">
      <div className="ht-container grid items-center gap-8 md:grid-cols-2 md:gap-16">
        <div
          className={`relative overflow-hidden ${imageFirst ? "" : "md:order-2"}`}
          style={{ borderRadius: "var(--ht-radius)", aspectRatio: "4 / 5" }}
        >
          <Image src={image} alt="" fill loading="lazy" sizes="(max-width: 768px) 100vw, 45vw" className="object-cover" aria-hidden />
        </div>
        <div className={imageFirst ? "" : "md:order-1"}>
          <h2 className="text-[1.8rem] md:text-[2.5rem]">{str(s.heading)}</h2>
          <div className="ht-prose mt-4 text-[0.98rem] leading-relaxed" style={{ color: "var(--ht-muted)" }}>
            {str(s.body)
              .split(/\n{2,}/)
              .map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
          </div>
          {str(s.buttonLabel) && (
            <Link href={str(s.buttonHref, "/about")} className="ht-btn ht-btn-outline mt-7">
              {str(s.buttonLabel)}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

function ShopTheLook({ s }: { s: S }) {
  const looks = activeLooks().slice(0, Math.min(num(s.limit, 3), 6));
  if (looks.length === 0) return null;

  return (
    <section className="ht-section" style={{ background: "var(--ht-surface)" }}>
      <div className="ht-container">
        <SectionHeading heading={str(s.heading)} subheading={str(s.subheading)} />
        <div className="grid gap-6 md:grid-cols-3">
          {looks.map((look) => (
            <article key={look.id}>
              <div className="relative overflow-hidden" style={{ borderRadius: "var(--ht-radius)", aspectRatio: "3 / 4" }}>
                <Image
                  src={look.imageUrl}
                  alt={look.imageAlt || look.title}
                  fill
                  loading="lazy"
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover"
                />
              </div>
              <h3 className="mt-4 text-xl">{look.title}</h3>
              {look.subtitle && (
                <p className="mt-1 text-sm" style={{ color: "var(--ht-muted)" }}>
                  {look.subtitle}
                </p>
              )}
              <div className="mt-3 flex flex-col gap-2">
                {productsByIds(look.productIds).map((product) => (
                  <ProductChip
                    key={product.id}
                    product={{
                      slug: product.slug,
                      name: `${product.name} · ${formatPaise(product.price)}`,
                      price: product.price,
                      image: product.images[0]?.url ?? null,
                    }}
                  />
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Usps({ s }: { s: S }) {
  const items = list(s.items);
  if (items.length === 0) return null;
  return (
    <section className="ht-section">
      <div className="ht-container">
        <SectionHeading heading={str(s.heading)} subheading={str(s.subheading)} />
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, i) => (
            <div key={i} className="border-t pt-5" style={{ borderColor: "var(--ht-border)" }}>
              <p className="ht-eyebrow mb-3">{String(i + 1).padStart(2, "0")}</p>
              <h3 className="text-lg">{str(item.title)}</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--ht-muted)" }}>
                {str(item.body)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function InstagramGrid({ s }: { s: S }) {
  const items = list(s.items);
  return (
    <section className="ht-section" style={{ background: "var(--ht-surface)" }}>
      <div className="ht-container">
        <div className="mb-8 text-center">
          <h2 className="text-[1.75rem] md:text-[2.35rem]">{str(s.heading)}</h2>
          <a
            href={str(s.profileUrl, "#")}
            target="_blank"
            rel="noreferrer noopener"
            className="ht-underline mt-2 inline-flex items-center gap-2 text-sm"
            style={{ color: "var(--ht-muted)" }}
          >
            <InstagramIcon size={15} /> {str(s.handle)}
          </a>
        </div>
        {items.length > 0 && (
          <div className="grid grid-cols-3 gap-2 md:grid-cols-6 md:gap-3">
            {items.map((item, i) => (
              <a
                key={i}
                href={str(item.href, str(s.profileUrl, "#"))}
                target="_blank"
                rel="noreferrer noopener"
                className="group relative block overflow-hidden"
                style={{ borderRadius: "calc(var(--ht-radius) * 0.6)", aspectRatio: "1 / 1" }}
                aria-label={`Open Instagram post ${i + 1}`}
              >
                <Image
                  src={str(item.imageUrl)}
                  alt=""
                  fill
                  loading="lazy"
                  sizes="(max-width: 768px) 33vw, 16vw"
                  className="object-cover transition duration-700 group-hover:scale-[1.07]"
                />
                <span
                  className="absolute inset-0 grid place-items-center opacity-0 transition group-hover:opacity-100"
                  style={{ background: "rgba(38,32,28,0.28)", color: "#fff" }}
                >
                  <InstagramIcon size={20} />
                </span>
              </a>
            ))}
          </div>
        )}
        {str(s.buttonLabel) && (
          <div className="mt-8 text-center">
            <a href={str(s.profileUrl, "#")} target="_blank" rel="noreferrer noopener" className="ht-btn ht-btn-outline">
              {str(s.buttonLabel)}
            </a>
          </div>
        )}
      </div>
    </section>
  );
}

function Testimonials({ s }: { s: S }) {
  const items = list(s.items);
  if (items.length === 0) return null;
  return (
    <section className="ht-section">
      <div className="ht-container">
        <SectionHeading heading={str(s.heading)} subheading={str(s.subheading)} />
        <div className="grid gap-5 md:grid-cols-3">
          {items.map((item, i) => (
            <figure key={i} className="ht-card flex h-full flex-col p-7">
              <Stars rating={num(item.rating, 5)} />
              <blockquote className="mt-4 flex-1 font-serif text-[1.18rem] leading-snug">
                “{str(item.body)}”
              </blockquote>
              <figcaption className="mt-5 text-sm" style={{ color: "var(--ht-muted)" }}>
                {str(item.name)}
                {str(item.location) ? ` · ${str(item.location)}` : ""}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function StoreLocation({ s, settings }: { s: S; settings: SiteSettings }) {
  const image = str(s.imageUrl) || settings.store.imageUrl;
  const address = [
    settings.store.addressLine1,
    settings.store.addressLine2,
    `${settings.store.city} ${settings.store.pincode}`,
    settings.store.state,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <section className="ht-section" style={{ background: "var(--ht-surface)" }}>
      <div className="ht-container grid items-center gap-8 md:grid-cols-2 md:gap-14">
        <div className="relative overflow-hidden" style={{ borderRadius: "var(--ht-radius)", aspectRatio: "4 / 3" }}>
          {s.showMap && settings.store.mapsEmbedUrl ? (
            <iframe
              src={settings.store.mapsEmbedUrl}
              title={`Map to ${settings.store.name}`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="absolute inset-0 h-full w-full border-0"
            />
          ) : image ? (
            <Image src={image} alt={settings.store.name} fill loading="lazy" sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
          ) : null}
        </div>
        <div>
          <h2 className="text-[1.8rem] md:text-[2.4rem]">{str(s.heading)}</h2>
          {str(s.body) && (
            <p className="mt-3 text-[0.98rem] leading-relaxed" style={{ color: "var(--ht-muted)" }}>
              {str(s.body)}
            </p>
          )}
          <dl className="mt-6 space-y-4 text-sm">
            <div className="flex gap-3">
              <MapPin size={17} strokeWidth={1.5} className="mt-0.5 shrink-0" style={{ color: "var(--ht-primary)" }} />
              <div>
                <dt className="font-medium">{settings.store.name}</dt>
                <dd style={{ color: "var(--ht-muted)" }}>{address}</dd>
              </div>
            </div>
            {settings.store.hours && (
              <div className="flex gap-3">
                <Clock size={17} strokeWidth={1.5} className="mt-0.5 shrink-0" style={{ color: "var(--ht-primary)" }} />
                <div>
                  <dt className="font-medium">Opening hours</dt>
                  <dd className="whitespace-pre-line" style={{ color: "var(--ht-muted)" }}>
                    {settings.store.hours}
                  </dd>
                </div>
              </div>
            )}
            {settings.contact.phone && (
              <div className="flex gap-3">
                <Phone size={17} strokeWidth={1.5} className="mt-0.5 shrink-0" style={{ color: "var(--ht-primary)" }} />
                <div>
                  <dt className="font-medium">Call the store</dt>
                  <dd style={{ color: "var(--ht-muted)" }}>
                    <a href={`tel:${settings.contact.phone.replace(/\s/g, "")}`}>{settings.contact.phone}</a>
                  </dd>
                </div>
              </div>
            )}
          </dl>
          <div className="mt-7 flex flex-wrap gap-3">
            {settings.store.mapsUrl && (
              <a href={settings.store.mapsUrl} target="_blank" rel="noreferrer noopener" className="ht-btn ht-btn-primary">
                Get Directions
              </a>
            )}
            <Link href="/store" className="ht-btn ht-btn-outline">
              Store details
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function WhatsappCta({ s, settings }: { s: S; settings: SiteSettings }) {
  const href = whatsappLink(settings.contact.whatsapp, str(s.message, "Hi Hairtie, I need help choosing something."));
  return (
    <section className="ht-section">
      <div className="ht-container">
        <div
          className="flex flex-col items-center gap-4 px-6 py-14 text-center md:px-16"
          style={{ borderRadius: "var(--ht-radius)", background: "var(--ht-secondary)" }}
        >
          <h2 className="text-[1.7rem] md:text-[2.3rem]">{str(s.heading)}</h2>
          {str(s.body) && <p className="max-w-md text-[0.98rem]">{str(s.body)}</p>}
          {href ? (
            <a href={href} target="_blank" rel="noreferrer noopener" className="ht-btn mt-2" style={{ background: "#25D366", color: "#fff" }}>
              <WhatsappIcon size={17} />
              {str(s.buttonLabel, "Chat on WhatsApp")}
            </a>
          ) : (
            <p className="mt-2 text-sm" style={{ color: "var(--ht-muted)" }}>
              Add a WhatsApp number in Store Settings to activate this button.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function Faq({ s }: { s: S }) {
  const items = list(s.items);
  if (items.length === 0) return null;
  return (
    <section className="ht-section">
      <div className="ht-container max-w-3xl">
        <SectionHeading heading={str(s.heading)} subheading={str(s.subheading)} />
        <div className="divide-y" style={{ borderColor: "var(--ht-border)" }}>
          {items.map((item, i) => (
            <details key={i} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[1.02rem] font-medium">
                {str(item.question)}
                <ChevronDown size={18} strokeWidth={1.5} className="shrink-0 transition group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-[0.95rem] leading-relaxed" style={{ color: "var(--ht-muted)" }}>
                {str(item.answer)}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Newsletter({ s }: { s: S }) {
  return (
    <section className="ht-section">
      <div className="ht-container max-w-xl text-center">
        <h2 className="text-[1.7rem] md:text-[2.2rem]">{str(s.heading)}</h2>
        {str(s.body) && (
          <p className="mt-3 text-[0.98rem]" style={{ color: "var(--ht-muted)" }}>
            {str(s.body)}
          </p>
        )}
        <div className="mt-6">
          <NewsletterForm buttonLabel={str(s.buttonLabel, "Subscribe")} />
        </div>
      </div>
    </section>
  );
}

function VideoBlock({ s }: { s: S }) {
  const url = str(s.videoUrl);
  if (!url) return null;
  const youtube = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/);

  return (
    <section className="ht-section">
      <div className="ht-container max-w-4xl">
        {str(s.heading) && <h2 className="mb-6 text-center text-[1.7rem] md:text-[2.2rem]">{str(s.heading)}</h2>}
        <div className="relative overflow-hidden" style={{ borderRadius: "var(--ht-radius)", aspectRatio: "16 / 9" }}>
          {youtube ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${youtube[1]}`}
              title={str(s.heading, "Video")}
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full border-0"
            />
          ) : (
            <video
              src={url}
              poster={str(s.posterUrl) || undefined}
              controls
              preload="none"
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
        </div>
      </div>
    </section>
  );
}

function TextSection({ s }: { s: S }) {
  const narrow = str(s.width, "narrow") === "narrow";
  const centered = str(s.align, "center") === "center";

  return (
    <section className="ht-section">
      <div className={`ht-container ${narrow ? "max-w-3xl" : ""} ${centered ? "text-center" : ""}`}>
        {str(s.heading) && <h2 className="text-[1.9rem] md:text-[2.6rem]">{str(s.heading)}</h2>}
        <div className="ht-prose mt-5 text-[1rem] leading-relaxed" style={{ color: "var(--ht-muted)" }}>
          {renderRichText(str(s.body))}
        </div>
      </div>
    </section>
  );
}

/** A deliberately small markdown subset: ## headings, - lists, blank-line paragraphs. */
function renderRichText(text: string) {
  const blocks = text.split(/\n{2,}/);
  return blocks.map((block, i) => {
    const trimmed = block.trim();
    if (trimmed.startsWith("### ")) return <h3 key={i} style={{ color: "var(--ht-text)" }}>{trimmed.slice(4)}</h3>;
    if (trimmed.startsWith("## ")) return <h2 key={i} className="text-[1.35rem]" style={{ color: "var(--ht-text)" }}>{trimmed.slice(3)}</h2>;
    if (/^[-*]\s/.test(trimmed)) {
      return (
        <ul key={i}>
          {trimmed.split("\n").map((line, j) => (
            <li key={j}>{line.replace(/^[-*]\s/, "")}</li>
          ))}
        </ul>
      );
    }
    return <p key={i}>{trimmed}</p>;
  });
}

function CustomImage({ s }: { s: S }) {
  const url = str(s.imageUrl);
  if (!url) return null;
  const width = str(s.width, "wide");
  const rounded = s.radius !== false;

  const image = (
    <div
      className="relative w-full overflow-hidden"
      style={{ borderRadius: rounded ? "var(--ht-radius)" : 0, aspectRatio: "16 / 9" }}
    >
      <Image src={url} alt={str(s.alt)} fill loading="lazy" sizes="100vw" className="object-cover" />
    </div>
  );

  const inner = str(s.href) ? <Link href={str(s.href)}>{image}</Link> : image;

  if (width === "full") return <section className="ht-section">{inner}</section>;
  return (
    <section className="ht-section">
      <div className={`ht-container ${width === "narrow" ? "max-w-3xl" : ""}`}>{inner}</div>
    </section>
  );
}

function FeatureColumns({ s }: { s: S }) {
  const items = list(s.items);
  if (items.length === 0) return null;
  const columns = Math.min(Math.max(num(s.columns, 3), 2), 4);
  const centered = str(s.align, "left") === "center";
  const grid =
    columns === 2 ? "sm:grid-cols-2" : columns === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3";

  return (
    <section className="ht-section">
      <div className="ht-container">
        <SectionHeading heading={str(s.heading)} subheading={str(s.subheading)} />
        <div className={`grid gap-6 md:gap-8 ${grid}`}>
          {items.map((item, i) => (
            <article key={i} className={centered ? "text-center" : ""}>
              {str(item.imageUrl) && (
                <div
                  className="relative mb-5 overflow-hidden"
                  style={{ borderRadius: "var(--ht-radius)", aspectRatio: "4 / 3" }}
                >
                  <Image
                    src={str(item.imageUrl)}
                    alt={str(item.title)}
                    fill
                    loading="lazy"
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-cover"
                  />
                </div>
              )}
              <h3 className="text-xl">{str(item.title)}</h3>
              {str(item.body) && (
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--ht-muted)" }}>
                  {str(item.body)}
                </p>
              )}
              {str(item.linkLabel) && (
                <Link href={str(item.linkHref, "/shop")} className="ht-underline mt-4 inline-block text-sm">
                  {str(item.linkLabel)}
                </Link>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Gallery({ s }: { s: S }) {
  const items = list(s.items).filter((item) => str(item.imageUrl));
  if (items.length === 0) return null;

  const columns = Math.min(Math.max(num(s.columns, 4), 2), 5);
  const gridByColumns: Record<number, string> = {
    2: "grid-cols-2",
    3: "grid-cols-2 md:grid-cols-3",
    4: "grid-cols-2 md:grid-cols-4",
    5: "grid-cols-2 md:grid-cols-5",
  };
  const gaps: Record<string, string> = { tight: "gap-1.5", normal: "gap-3 md:gap-4", roomy: "gap-5 md:gap-7" };
  const ratios: Record<string, string> = { square: "1 / 1", portrait: "3 / 4", landscape: "4 / 3" };
  const ratio = ratios[str(s.shape, "square")] ?? "1 / 1";

  return (
    <section className="ht-section">
      <div className="ht-container">
        <SectionHeading heading={str(s.heading)} subheading={str(s.subheading)} />
        <div className={`grid ${gridByColumns[columns]} ${gaps[str(s.gap, "normal")] ?? gaps.normal}`}>
          {items.map((item, i) => {
            const figure = (
              <figure className="group">
                <div
                  className="relative overflow-hidden"
                  style={{ borderRadius: "calc(var(--ht-radius) * 0.7)", aspectRatio: ratio }}
                >
                  <Image
                    src={str(item.imageUrl)}
                    alt={str(item.caption)}
                    fill
                    loading="lazy"
                    sizes={`(max-width: 768px) 50vw, ${Math.round(100 / columns)}vw`}
                    className="object-cover transition duration-700 group-hover:scale-[1.05]"
                  />
                </div>
                {str(item.caption) && (
                  <figcaption className="mt-2 text-[0.82rem]" style={{ color: "var(--ht-muted)" }}>
                    {str(item.caption)}
                  </figcaption>
                )}
              </figure>
            );
            return str(item.href) ? (
              <Link key={i} href={str(item.href)}>
                {figure}
              </Link>
            ) : (
              <div key={i}>{figure}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function AnnouncementStrip({ s }: { s: S }) {
  const items = list(s.items).filter((item) => str(item.text));
  if (items.length === 0) return null;

  return (
    <section
      style={{ background: str(s.background, "#f3e3e0"), color: str(s.textColor, "#2f2925") }}
    >
      <div className="ht-container">
        <div className="ht-scroll-x flex items-center justify-start gap-6 py-2.5 text-[0.82rem] md:justify-center">
          {items.map((item, i) => {
            const label = <span className="whitespace-nowrap">{str(item.text)}</span>;
            return (
              <span key={i} className="flex items-center gap-6">
                {i > 0 && <span aria-hidden style={{ opacity: 0.35 }}>•</span>}
                {str(item.href) ? (
                  <Link href={str(item.href)} className="ht-underline whitespace-nowrap">
                    {str(item.text)}
                  </Link>
                ) : (
                  label
                )}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}
