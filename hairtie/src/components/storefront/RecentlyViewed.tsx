"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { formatPaise } from "@/lib/money";

const KEY = "hairtie:recently-viewed";
const MAX = 8;

export type RecentProduct = { slug: string; name: string; price: number; image: string | null };

/**
 * localStorage is an external store, so it is read through useSyncExternalStore
 * rather than copied into state inside an effect. The snapshot is cached by its
 * raw string so React sees a stable reference between renders.
 */
let snapshotCache: { raw: string; parsed: RecentProduct[] } = { raw: "", parsed: [] };

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function readStore(): RecentProduct[] {
  let raw = "[]";
  try {
    raw = localStorage.getItem(KEY) ?? "[]";
  } catch {
    return snapshotCache.parsed;
  }
  if (raw !== snapshotCache.raw) {
    try {
      const parsed = JSON.parse(raw);
      snapshotCache = { raw, parsed: Array.isArray(parsed) ? parsed : [] };
    } catch {
      snapshotCache = { raw, parsed: [] };
    }
  }
  return snapshotCache.parsed;
}

const EMPTY: RecentProduct[] = [];

/** Records the current product, then shows the ones seen before it. */
export function RecentlyViewed({ current }: { current: RecentProduct }) {
  const stored = useSyncExternalStore(subscribe, readStore, () => EMPTY);

  // Writing the visit back out is a side effect on an external system, which is
  // exactly what an effect is for.
  useEffect(() => {
    try {
      const existing: RecentProduct[] = JSON.parse(localStorage.getItem(KEY) ?? "[]");
      const others = existing.filter((item) => item?.slug && item.slug !== current.slug);
      localStorage.setItem(KEY, JSON.stringify([current, ...others].slice(0, MAX + 1)));
    } catch {
      // Private browsing or blocked storage — the feature is simply skipped.
    }
  }, [current]);

  const items = stored.filter((item) => item?.slug && item.slug !== current.slug).slice(0, MAX);

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
