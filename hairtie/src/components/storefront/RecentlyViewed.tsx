"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatPaise } from "@/lib/money";

const KEY = "hairtie:recently-viewed";
const MAX = 8;

export type RecentProduct = { slug: string; name: string; price: number; image: string | null };

/** Records the current product, then shows the ones seen before it. */
export function RecentlyViewed({ current }: { current: RecentProduct }) {
  const [items, setItems] = useState<RecentProduct[]>([]);

  useEffect(() => {
    let stored: RecentProduct[] = [];
    try {
      stored = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    } catch {
      stored = [];
    }
    const others = stored.filter((item) => item?.slug && item.slug !== current.slug);
    setItems(others.slice(0, MAX));
    try {
      localStorage.setItem(KEY, JSON.stringify([current, ...others].slice(0, MAX + 1)));
    } catch {
      // Private browsing or blocked storage — the feature is simply skipped.
    }
  }, [current]);

  if (items.length === 0) return null;

  return (
    <section className="ht-section">
      <div className="ht-container">
        <h2 className="mb-6 text-[1.5rem] md:text-[1.9rem]">Recently viewed</h2>
        <div className="ht-scroll-x -mx-5 px-5 md:mx-0 md:px-0">
          {items.map((item) => (
            <Link key={item.slug} href={`/products/${item.slug}`} className="w-[38vw] max-w-[11rem] md:w-44">
              <div
                className="relative overflow-hidden"
                style={{ aspectRatio: "4 / 5", borderRadius: "var(--ht-radius)", background: "var(--ht-surface)" }}
              >
                {item.image && (
                  <Image src={item.image} alt={item.name} fill sizes="180px" className="object-cover" loading="lazy" />
                )}
              </div>
              <p className="mt-2 truncate text-sm">{item.name}</p>
              <p className="text-sm" style={{ color: "var(--ht-muted)" }}>
                {formatPaise(item.price)}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
