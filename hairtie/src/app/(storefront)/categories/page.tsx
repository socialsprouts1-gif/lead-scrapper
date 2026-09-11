import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSiteSettings } from "@/lib/settings";
import { buildMetadata, resolveSiteUrl } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const siteUrl = await resolveSiteUrl(settings);
  return buildMetadata({
    settings,
    siteUrl,
    title: "Shop by Category — Hair Accessories & Handbags | Hairtie",
    description:
      "Browse Hairtie by category: claw clips, scrunchies, hair bows, hair bands, sling bags, tote bags, shoulder bags and clutches.",
    path: "/categories",
  });
}

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    where: { isActive: true, parentId: null },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    include: {
      children: {
        where: { isActive: true },
        orderBy: [{ position: "asc" }, { name: "asc" }],
        include: { _count: { select: { products: { where: { status: "ACTIVE" } } } } },
      },
      _count: { select: { products: { where: { status: "ACTIVE" } } } },
    },
  });

  return (
    <div className="ht-container py-10 md:py-16">
      <nav aria-label="Breadcrumb" className="mb-4 text-xs" style={{ color: "var(--ht-muted)" }}>
        <Link href="/" className="ht-underline">Home</Link> <span className="px-1">/</span> Categories
      </nav>
      <header className="mb-10 max-w-2xl">
        <h1 className="text-[2.1rem] md:text-[2.8rem]">Shop by category</h1>
        <p className="mt-2 text-[0.98rem]" style={{ color: "var(--ht-muted)" }}>
          Find your next favourite by the kind of piece you love.
        </p>
      </header>

      <div className="space-y-14">
        {categories.map((category) => (
          <section key={category.id}>
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-[1.6rem] md:text-[2rem]">{category.name}</h2>
                {category.description && (
                  <p className="mt-1 max-w-xl text-sm" style={{ color: "var(--ht-muted)" }}>
                    {category.description}
                  </p>
                )}
              </div>
              <Link href={`/categories/${category.slug}`} className="ht-underline shrink-0 text-[0.78rem] uppercase tracking-[0.14em]">
                View all →
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
              {(category.children.length > 0 ? category.children : [category]).map((entry) => (
                <Link key={entry.id} href={`/categories/${entry.slug}`} className="group block">
                  <div
                    className="relative overflow-hidden"
                    style={{ aspectRatio: "4 / 5", borderRadius: "var(--ht-radius)", background: "var(--ht-surface)" }}
                  >
                    {entry.imageUrl && (
                      <Image
                        src={entry.imageUrl}
                        alt={entry.imageAlt || entry.name}
                        fill
                        loading="lazy"
                        sizes="(max-width: 768px) 50vw, 25vw"
                        className="object-cover transition duration-700 group-hover:scale-[1.06]"
                      />
                    )}
                    <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(38,32,28,0.5), transparent 55%)" }} />
                    <div className="absolute inset-x-4 bottom-4 text-white">
                      <p className="font-serif text-lg leading-tight md:text-xl">{entry.name}</p>
                      <p className="text-xs opacity-85">{entry._count.products} pieces</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
