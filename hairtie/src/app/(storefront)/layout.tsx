import Script from "next/script";
import { getCurrentUser } from "@/lib/auth";
import { getCart } from "@/lib/cart";
import { prisma } from "@/lib/db";
import { getSiteSettings, getTheme, themeToCssVars } from "@/lib/settings";
import { jsonLd, organizationSchema, resolveSiteUrl } from "@/lib/seo";
import { Header } from "@/components/storefront/Header";
import { Footer } from "@/components/storefront/Footer";
import { MobileNav } from "@/components/storefront/MobileNav";
import { WhatsappFloat } from "@/components/storefront/WhatsappFloat";
import { ToastProvider } from "@/components/ui/Toast";

export default async function StorefrontLayout({ children }: LayoutProps<"/">) {
  const [settings, theme, user, cart] = await Promise.all([
    getSiteSettings(),
    getTheme(),
    getCurrentUser(),
    getCart(),
  ]);

  const [categories, wishlistCount, siteUrl] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: {
        name: true,
        slug: true,
        children: {
          where: { isActive: true },
          orderBy: [{ position: "asc" }, { name: "asc" }],
          select: { name: true, slug: true },
        },
      },
    }),
    user ? prisma.wishlistItem.count({ where: { userId: user.id } }) : Promise.resolve(0),
    resolveSiteUrl(settings),
  ]);

  const cartCount = (cart?.items ?? [])
    .filter((item) => !item.savedForLater)
    .reduce((sum, item) => sum + item.quantity, 0);

  const cssVars = themeToCssVars(theme);
  const gaId = settings.analytics.googleAnalyticsId;

  return (
    <div style={cssVars as React.CSSProperties} className="flex min-h-screen flex-col">
      <ToastProvider>
        <Header
          settings={settings}
          categories={categories}
          cartCount={cartCount}
          wishlistCount={wishlistCount}
          signedIn={Boolean(user)}
        />
        <main className="flex-1">{children}</main>
        <Footer settings={settings} />
        <MobileNav cartCount={cartCount} wishlistCount={wishlistCount} />
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
