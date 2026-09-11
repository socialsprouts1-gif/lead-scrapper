import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getDraftPage } from "@/lib/pages";
import { getSiteSettings, getTheme, themeToCssVars } from "@/lib/settings";
import { getWishlistIds } from "@/app/actions/wishlist";
import { SectionList } from "@/components/sections/SectionRenderer";
import { Header } from "@/components/storefront/Header";
import { Footer } from "@/components/storefront/Footer";
import { ToastProvider } from "@/components/ui/Toast";
import { PreviewBridge } from "@/components/admin/PreviewBridge";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * The live preview shown inside the website editor. It renders the *draft*
 * sections (not the published snapshot) inside the real storefront chrome, and
 * reports clicks back to the editor so a section can be selected by clicking it.
 */
export default async function PreviewPage(props: PageProps<"/preview/[slug]">) {
  await requireAdmin();
  const { slug } = await props.params;
  const search = await props.searchParams;
  const selected = typeof search.selected === "string" ? search.selected : null;
  const themeDraft = search.theme === "draft";

  const [draft, settings, theme, wishlist] = await Promise.all([
    getDraftPage(slug),
    getSiteSettings(),
    getTheme({ draft: themeDraft }),
    getWishlistIds(),
  ]);
  if (!draft) notFound();

  const categories = await prisma.category.findMany({
    where: { isActive: true, parentId: null },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    select: {
      name: true,
      slug: true,
      children: {
        where: { isActive: true },
        orderBy: [{ position: "asc" }],
        select: { name: true, slug: true },
      },
    },
  });

  return (
    <div style={themeToCssVars(theme) as React.CSSProperties} className="flex min-h-screen flex-col">
      <ToastProvider>
        <Header
          settings={settings}
          categories={categories}
          cartCount={0}
          wishlistCount={0}
          signedIn={false}
        />
        <main className="flex-1">
          {draft.sections.length === 0 ? (
            <div className="ht-container ht-section text-center">
              <p className="font-serif text-2xl">This page is empty</p>
              <p className="mt-2 text-sm" style={{ color: "var(--ht-muted)" }}>
                Use “Add a section” on the left to start building it.
              </p>
            </div>
          ) : (
            draft.sections.map((section) => (
              <div
                key={section.id}
                data-section-id={section.id}
                data-selected={section.id === selected ? "true" : undefined}
                style={{
                  position: "relative",
                  opacity: section.isHidden ? 0.42 : 1,
                  outline: section.id === selected ? "2px solid var(--ht-primary)" : undefined,
                  outlineOffset: "-2px",
                }}
              >
                {section.isHidden && (
                  <span
                    style={{
                      position: "absolute",
                      top: 8,
                      left: 8,
                      zIndex: 5,
                      background: "rgba(47,41,37,0.85)",
                      color: "#fff",
                      fontSize: 11,
                      padding: "3px 8px",
                      borderRadius: 999,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    Hidden on the live site
                  </span>
                )}
                <SectionList sections={[section]} context={{ settings, wishlist }} />
              </div>
            ))
          )}
        </main>
        <Footer settings={settings} />
      </ToastProvider>
      <PreviewBridge />
    </div>
  );
}
