import "server-only";
import { mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import path from "node:path";
import { after } from "next/server";
import { get as getBlob, put as putBlob } from "@vercel/blob";
import { buildSeed } from "@/data/seed";
import { DEFAULT_PAYMENT_SETTINGS, type PaymentSettings } from "@/lib/payment-settings";
import { DEFAULT_SITE_SETTINGS, type SiteSettings } from "@/lib/site-settings";
import { DEFAULT_THEME, type ThemeSettings } from "@/lib/theme";
import type {
  Cart, Category, Coupon, CustomerProfile, Look, MediaAsset, NewsletterSignup, Order, Page,
  Product, Review,
} from "@/lib/types";

/**
 * The whole shop, in one JSON document.
 *
 * There is no database. The document is held in memory and written to
 * `.data/hairtie.json` whenever it changes, so the shop keeps its products,
 * orders and page edits across restarts with nothing to install.
 *
 * Where that document lives depends on the host:
 *
 *   blob    Vercel Blob, when BLOB_READ_WRITE_TOKEN is set. The blob is
 *           *private* — it holds customer addresses and gateway keys, so it is
 *           never readable from a URL.
 *   disk    `.data/hairtie.json`, on any host with a writable filesystem.
 *   memory  Neither of the above: everything works, but changes last only
 *           until the server restarts.
 *
 * `isPersistent` reports which mode is in effect so the admin can say so
 * plainly, and `storageBackend` names it.
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
  /** Gateway keys live here and are never sent to the browser. */
  payments: PaymentSettings;
  /** Shop-owner notes and tags, keyed by the customer's email address. */
  customerProfiles: CustomerProfile[];
  theme: { published: ThemeSettings; draft: ThemeSettings | null };
};

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "hairtie.json");
const BLOB_KEY = "hairtie/shop.json";
const STORE_VERSION = 1;

export type StorageBackend = "blob" | "disk" | "memory";

type Cache = { store: Store; backend: StorageBackend; warned: boolean };

/** Vercel injects this when a Blob store is connected to the project. */
function blobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/**
 * Blob writes are serialised: each one waits for the last, so two quick edits
 * cannot race and leave the older copy on top.
 */
let writeChain: Promise<void> = Promise.resolve();

// Cached on globalThis so the dev server's module reloading doesn't drop the
// shop's state on every edit.
const globalForStore = globalThis as unknown as { hairtieStore?: Cache };

function emptyDefaults(): Pick<
  Store,
  "settings" | "payments" | "customerProfiles" | "theme" | "version"
> {
  return {
    version: STORE_VERSION,
    settings: DEFAULT_SITE_SETTINGS,
    payments: DEFAULT_PAYMENT_SETTINGS,
    customerProfiles: [],
    theme: { published: DEFAULT_THEME, draft: null },
  };
}

/**
 * Fills in fields added after a shop was first saved, so an older
 * `.data/hairtie.json` keeps working without a migration step.
 */
function backfill(data: Store) {
  for (const order of data.orders ?? []) {
    order.codFee ??= 0;
  }
}

function parseStore(raw: string): Store | null {
  try {
    const parsed = JSON.parse(raw) as Store;
    if (!parsed || parsed.version !== STORE_VERSION || !Array.isArray(parsed.products)) return null;
    const merged = { ...emptyDefaults(), ...parsed };
    backfill(merged);
    return merged;
  } catch {
    return null;
  }
}

function seeded(): Store {
  return { ...emptyDefaults(), ...buildSeed() };
}

/* ------------------------------------------------------------------ disk */

function loadFromDisk(): Cache {
  try {
    const parsed = parseStore(readFileSync(DATA_FILE, "utf8"));
    if (parsed) return { store: parsed, backend: "disk", warned: false };
  } catch {
    // No saved file yet, or it is unreadable — fall through and seed.
  }

  const cache: Cache = { store: seeded(), backend: "memory", warned: false };

  // Writing the seeded shop out is also the test of whether the disk is
  // writable, which is what decides if later edits survive a restart.
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(DATA_FILE, JSON.stringify(cache.store, null, 2));
    cache.backend = "disk";
  } catch {
    cache.backend = "memory";
  }

  return cache;
}

function saveToDisk(current: Cache) {
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    // Write to a temporary file first so a crash mid-write cannot leave a
    // half-written shop behind.
    const temporary = `${DATA_FILE}.tmp`;
    writeFileSync(temporary, JSON.stringify(current.store, null, 2));
    renameSync(temporary, DATA_FILE);
  } catch (error) {
    current.backend = "memory";
    console.warn("[hairtie] Could not save the shop to disk:", error);
  }
}

/* ------------------------------------------------------------------ blob */

async function readBlob(): Promise<Store | null> {
  const result = await getBlob(BLOB_KEY, { access: "private", useCache: false });
  if (!result || result.statusCode !== 200) return null;
  return parseStore(await new Response(result.stream).text());
}

function writeBlob(current: Cache): Promise<void> {
  // Serialise now, so the write records the shop as it is at this moment
  // rather than whatever it has become by the time the write runs.
  const body = JSON.stringify(current.store);

  writeChain = writeChain
    .then(async () => {
      await putBlob(BLOB_KEY, body, {
        access: "private",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: true,
        cacheControlMaxAge: 0,
      });
    })
    .catch((error) => {
      console.warn("[hairtie] Could not save the shop to Vercel Blob:", error);
    });

  keepAlive(writeChain);
  return writeChain;
}

/**
 * Asks the platform to keep this instance alive until the write lands.
 * Outside a request — a script, a test — there is nothing to hold open.
 */
function keepAlive(promise: Promise<unknown>) {
  try {
    after(promise);
  } catch {
    // Not in a request scope; the promise still runs to completion here.
  }
}

/* ----------------------------------------------------------------- setup */

/**
 * Loads the shop before the server takes its first request. Called once per
 * server start from `instrumentation.ts`, which Next.js awaits during boot —
 * that is what lets every read below stay synchronous.
 */
export async function hydrate(): Promise<StorageBackend> {
  if (globalForStore.hairtieStore) return globalForStore.hairtieStore.backend;

  if (!blobConfigured()) {
    globalForStore.hairtieStore = loadFromDisk();
    return globalForStore.hairtieStore.backend;
  }

  try {
    const stored = await readBlob();
    if (stored) {
      globalForStore.hairtieStore = { store: stored, backend: "blob", warned: false };
      return "blob";
    }
  } catch (error) {
    console.warn("[hairtie] Could not read the shop from Vercel Blob:", error);
    globalForStore.hairtieStore = { store: seeded(), backend: "memory", warned: false };
    return "memory";
  }

  // Nothing stored yet — this is the shop's first run against the blob.
  const fresh: Cache = { store: seeded(), backend: "blob", warned: false };
  globalForStore.hairtieStore = fresh;
  await writeBlob(fresh);
  return "blob";
}

function cache(): Cache {
  if (!globalForStore.hairtieStore) {
    if (blobConfigured()) {
      // hydrate() should have run at boot. Serving seed data from memory is
      // the safe failure: it never overwrites what is in the blob.
      console.warn(
        "[hairtie] The shop was read before it was loaded from Vercel Blob. " +
          "Check that instrumentation.ts is present.",
      );
      globalForStore.hairtieStore = { store: seeded(), backend: "memory", warned: false };
    } else {
      globalForStore.hairtieStore = loadFromDisk();
    }
  }
  return globalForStore.hairtieStore;
}

/** The live shop document. Mutate it, then call `save()`. */
export function store(): Store {
  return cache().store;
}

/** True when edits made in the admin will survive a restart. */
export function isPersistent() {
  return cache().backend !== "memory";
}

/** Which of the three stores is in use, for the admin to report. */
export function storageBackend(): StorageBackend {
  return cache().backend;
}

export function save() {
  const current = cache();

  if (current.backend === "blob") {
    void writeBlob(current);
    return;
  }

  if (current.backend === "disk") {
    saveToDisk(current);
    return;
  }

  if (!current.warned) {
    current.warned = true;
    console.warn(
      "[hairtie] This host has no writable storage, so shop changes are kept in memory only " +
        "and will be lost when the server restarts.",
    );
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
  cache().store = seeded();
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
