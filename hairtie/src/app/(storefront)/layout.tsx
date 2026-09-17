import Script from "next/script";
import { getCart } from "@/lib/cart";
import { allCategories } from "@/lib/catalog";
import { getWishlistIds } from "@/lib/wishlist";
import { getSiteSettings, getTheme, themeToCssVars } from "@/lib/settings";
import { jsonLd, organizationSchema, resolveSiteUrl } from "@/lib/seo";
import { Header } from "@/components/storefront/Header";
import { Footer } from "@/components/storefront/Footer";
import { MobileNav } from "@/components/storefront/MobileNav";
import { WhatsappFloat } from "@/components/storefront/WhatsappFloat";
import { ToastProvider } from "@/components/ui/Toast";

export default async function StorefrontLayout({ children }: LayoutProps<"/">) {
  const settings = getSiteSettings();
  const theme = getTheme();
  const [cart, wishlist, siteUrl] = await Promise.all([
    getCart(),
    getWishlistIds(),
    resolveSiteUrl(settings),
  ]);

  const active = allCategories().filter((category) => category.isActive);
  const categories = active
    .filter((category) => !category.parentId)
    .map((category) => ({
      name: category.name,
      slug: category.slug,
      children: active
        .filter((child) => child.parentId === category.id)
        .map((child) => ({ name: child.name, slug: child.slug })),
    }));

  const cartCount = (cart?.lines ?? [])
    .filter((line) => !line.item.savedForLater)
    .reduce((sum, line) => sum + line.item.quantity, 0);

  const cssVars = themeToCssVars(theme);
  const gaId = settings.analytics.googleAnalyticsId;

  return (
    <div style={cssVars as React.CSSProperties} className="flex min-h-screen flex-col">
      <ToastProvider>
        <Header
          settings={settings}
          categories={categories}
          cartCount={cartCount}
          wishlistCount={wishlist.length}
        />
        <main className="flex-1">{children}</main>
        <Footer settings={settings} />
        <MobileNav cartCount={cartCount} wishlistCount={wishlist.length} />
        <WhatsappFloat number={settings.contact.whatsapp} storeName={settings.storeName} />
      </ToastProvider>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(organizationSchema(settings, siteUrl))}
      />

      {gaId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`}
          </Script>
        </>
      )}
    </div>
  );
}
