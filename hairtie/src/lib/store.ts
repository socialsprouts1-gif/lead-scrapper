import "server-only";
import { mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import path from "node:path";
import { buildSeed } from "@/data/seed";
import { DEFAULT_SITE_SETTINGS, type SiteSettings } from "@/lib/site-settings";
import { DEFAULT_THEME, type ThemeSettings } from "@/lib/theme";
import type {
  Cart, Category, Coupon, Look, MediaAsset, NewsletterSignup, Order, Page, Product, Review,
} from "@/lib/types";

/**
 * The whole shop, in one JSON document.
 *
 * There is no database. The document is held in memory and written to
 * `.data/hairtie.json` whenever it changes, so the shop keeps its products,
 * orders and page edits across restarts with nothing to install.
 *
 * On a host with a read-only filesystem (Vercel and most serverless platforms)
 * the write is skipped and the shop runs from memory: everything works, but
 * changes made in the admin last only until the server restarts. `isPersistent`
 * reports which mode is in effect so the admin can say so plainly.
 */

export type Store = {
  version: number;
  products: Product[];
  categories: Category[];
  orders: Order[];
  reviews: Review[];
  coupons: Coupon[];
  pages: Page[];
  looks: Look[];
  media: MediaAsset[];
  carts: Cart[];
  newsletter: NewsletterSignup[];
  settings: SiteSettings;
  theme: { published: ThemeSettings; draft: ThemeSettings | null };
};

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "hairtie.json");
const STORE_VERSION = 1;

type Cache = { store: Store; persistent: boolean; warned: boolean };

// Cached on globalThis so the dev server's module reloading doesn't drop the
// shop's state on every edit.
const globalForStore = globalThis as unknown as { hairtieStore?: Cache };

function emptyDefaults(): Pick<Store, "settings" | "theme" | "version"> {
  return {
    version: STORE_VERSION,
    settings: DEFAULT_SITE_SETTINGS,
    theme: { published: DEFAULT_THEME, draft: null },
  };
}

function load(): Cache {
  // Read whatever was saved last.
  try {
    const raw = readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Store;
    if (parsed && parsed.version === STORE_VERSION && Array.isArray(parsed.products)) {
      return { store: { ...emptyDefaults(), ...parsed }, persistent: true, warned: false };
    }
  } catch {
    // No saved file yet, or it is unreadable — fall through and seed.
  }

  const store: Store = { ...emptyDefaults(), ...buildSeed() };
  const cache: Cache = { store, persistent: false, warned: false };

  // Try to write the seeded shop out. Success also tells us the disk is
  // writable, which is what decides whether later edits survive a restart.
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
    cache.persistent = true;
  } catch {
    cache.persistent = false;
  }

  return cache;
}

function cache(): Cache {
  if (!globalForStore.hairtieStore) {
    globalForStore.hairtieStore = load();
  }
  return globalForStore.hairtieStore;
}

/** The live shop document. Mutate it, then call `save()`. */
export function store(): Store {
  return cache().store;
}

/** True when edits made in the admin will survive a restart. */
export function isPersistent() {
  return cache().persistent;
}

export function save() {
  const current = cache();
  if (!current.persistent) {
    if (!current.warned) {
      current.warned = true;
      console.warn(
        "[hairtie] This host has a read-only filesystem, so shop changes are kept in memory only " +
          "and will be lost when the server restarts.",
      );
    }
    return;
  }
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    // Write to a temporary file first so a crash mid-write cannot leave a
    // half-written shop behind.
    const temporary = `${DATA_FILE}.tmp`;
    writeFileSync(temporary, JSON.stringify(current.store, null, 2));
    renameSync(temporary, DATA_FILE);
  } catch (error) {
    current.persistent = false;
    console.warn("[hairtie] Could not save the shop to disk:", error);
  }
}

/** Runs a change against the shop and saves it. */
export function mutate<T>(change: (data: Store) => T): T {
  const result = change(store());
  save();
  return result;
}

/** Restores the demo shop, discarding everything currently stored. */
export function resetToSeed() {
  const current = cache();
  current.store = { ...emptyDefaults(), ...buildSeed() };
  save();
}

/* -------------------------------------------------------------------------- */
/* Small helpers used across the data layer                                   */
/* -------------------------------------------------------------------------- */

let counter = 0;

/** Short, sortable, collision-resistant id. */
export function createId(prefix = "id") {
  counter = (counter + 1) % 100000;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

export function now() {
  return new Date().toISOString();
}

/** Case-insensitive "contains", used by every search box in the app. */
export function matches(haystack: string | null | undefined, needle: string) {
  if (!haystack) return false;
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

export function byPosition<T extends { position: number }>(a: T, b: T) {
  return a.position - b.position;
}

export function newestFirst(a: { createdAt: string }, b: { createdAt: string }) {
  return b.createdAt.localeCompare(a.createdAt);
}
