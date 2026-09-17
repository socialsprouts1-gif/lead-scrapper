# Hairtie

A premium direct-to-consumer store for **Hairtie** — hair accessories, handbags
and everyday fashion pieces — with an admin panel and a visual website editor
built for a non-technical owner to run without a developer.

**It runs with nothing installed but the code.** No database, no accounts, no
sign-in, no configuration.

```bash
git clone https://github.com/socialsprouts1-gif/hairtie.git
cd hairtie
npm install
npm run dev          # http://localhost:3000
```

That's it. The shop opens with 34 demo products, a built homepage and a working
checkout. The admin panel is at **`/admin`** and opens straight away.

```
Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4
Data: a single JSON file · Payments: Razorpay (optional)
```

---

## How the data works

There is no database. The whole shop — products, categories, orders, reviews,
discounts, page layouts and settings — lives in one JSON document held in memory
and written to **`.data/hairtie.json`** whenever something changes.

- **First run** seeds it from the demo content in `src/data/seed.ts`.
- **Every change** in the admin is saved to that file, so it survives restarts.
- **Delete `.data/`** to reset the shop back to the demo content.
- **Back it up** by copying that one file. That is your entire shop.

On a host with a read-only filesystem — Vercel and most serverless platforms —
the write is skipped and the shop runs from memory. Everything still works, but
admin changes last only until the server restarts. The admin sidebar says so
plainly when that is the case.

| Where you run it | Do changes persist? |
| --- | --- |
| Your own computer (`npm run dev`) | Yes |
| A normal server or VPS (`npm start`) | Yes |
| Vercel / Netlify / serverless | No — memory only, resets on redeploy |

If you outgrow this — thousands of products, several people editing at once,
real traffic — the data layer is one module (`src/lib/store.ts`) behind a set of
typed helpers. Swapping it for PostgreSQL means rewriting that layer, not the
app.

## No sign-in

There is no login anywhere, for customers or for the admin.

- Customers check out as guests. Their order number and phone are what they use
  to track an order.
- The wishlist is kept in a cookie in the visitor's own browser.
- `/admin` is open to anyone who can reach it.

> **Before you put this on a public URL:** anyone who finds `/admin` can change
> your products and read your orders. On your own computer that is fine. On the
> public internet, put it behind your host's password protection (Vercel's
> Deployment Protection, Netlify's site password, or HTTP basic auth in nginx),
> or ask a developer to switch the sign-in back on.

---

## What is built

### Storefront
Home, Shop (search, category / price / colour / tag / availability filters, five
sort orders), Categories, Product detail (gallery with zoom, swipeable on mobile,
variants, specifications, reviews, related and recently viewed), Cart, Checkout,
Order confirmation, Order tracking, Wishlist, Contact, Store, About, FAQ, Privacy
Policy, Terms, Shipping & Returns.

Mobile-first throughout: sticky header, bottom navigation, swipeable product
images, a sticky add-to-bag bar and a WhatsApp button on every screen.

### Admin panel
Dashboard · Orders · Products · Categories · Website Editor · Appearance · Media ·
Customers · Discounts · Reviews · Analytics · Store Settings.

Customers are derived from order history rather than stored as accounts — one row
per email address, with everything that person has bought.

### Visual website editor
A theme-editor-style builder: a section tree on the left, the section's settings
beside it, and the real page on the right.

- **Click to edit** — pick a section in the tree or click it straight on the
  preview. The preview highlights whatever the pointer is over, in both
  directions.
- **Drag and drop at two levels** — sections reorder within the page, and a
  section's *blocks* (a FAQ question, a review, an Instagram photo, a gallery
  image, a column) reorder inside their section. A block never escapes its
  section, and the canvas pulls back while you drag so you can see where things
  will land.
- **Blocks are first-class** — each one can be added, duplicated, hidden or
  deleted from the tree, and hiding one keeps its content in the draft.
- **Add anywhere** — the "+" between two rows inserts a section at that exact
  spot; the picker is searchable and grouped.
- **Undo / redo** — ⌘Z and ⌘⇧Z, up to 60 steps, covering edits, reorders and
  deletions alike.
- **Desktop / tablet / mobile** previews, plus a full-width mode.

Edits save as you type into a **draft**; the public site only changes when you
press **Publish**, and **Discard** restores the last published version. Twenty-one
section types ship with it.

### Payments
Cash on Delivery works out of the box. Razorpay (UPI, cards, net banking, wallets)
activates as soon as the keys are present. Totals are always recalculated on the
server, stock is verified before an order is written, and payments are only
accepted after the Razorpay signature is verified.

### SEO
Per-product and per-page titles, descriptions, keywords, canonical URLs and Open
Graph images; Product, Store and Breadcrumb structured data; an automatic sitemap
and robots.txt.

---

## Environment variables

None are required. Each one only switches on an extra feature — see
`.env.example` for the annotated list.

| Variable | What it does |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Public address, for canonical URLs and the sitemap. Also settable in Admin → Store Settings. |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Turns on online payment. Without them, checkout is Cash on Delivery only. |
| `RAZORPAY_WEBHOOK_SECRET` | Verifies Razorpay webhooks at `/api/payments/razorpay/webhook`. |
| `MEDIA_DRIVER` | `local` (default) or `supabase`. |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_STORAGE_BUCKET` | Where uploaded images go when `MEDIA_DRIVER=supabase`. |

---

## Project layout

```
├── scripts/generate-placeholders.mjs   # regenerates the demo imagery
├── public/images/                      # demo photos (replace with real ones)
└── src/
    ├── data/seed.ts        # the demo shop: products, pages, reviews
    ├── app/
    │   ├── (storefront)/   # everything a customer sees
    │   ├── admin/          # the shop manager
    │   ├── preview/[slug]/ # live draft preview used by the editor
    │   ├── api/            # media uploads, reviews, payments, invoices
    │   ├── actions/        # server actions (cart, checkout, admin)
    │   └── sitemap.ts · robots.ts
    ├── components/         # storefront/ · sections/ · admin/ · ui/
    └── lib/
        ├── store.ts        # the JSON document: load, save, mutate
        ├── types.ts        # the data model
        ├── catalog.ts · cart.ts · orders.ts · pages.ts · settings.ts
        └── seo.ts · storage.ts · razorpay.ts · whatsapp.ts
```

### Where to change things

| To change | Edit |
| --- | --- |
| A new page-builder section | `src/lib/sections.ts` + a component in `src/components/sections/SectionRenderer.tsx` |
| Draggable blocks inside a section | give that section a `blocksKey` pointing at a `repeater` field in `src/lib/sections.ts` |
| Product fields | `src/lib/types.ts`, then `src/components/admin/ProductForm.tsx` |
| Shipping or tax logic | `src/lib/cart.ts` |
| Order rules | `src/lib/orders.ts` |
| Payment provider | `src/lib/razorpay.ts` and `src/app/api/payments/` |
| Image storage | `src/lib/storage.ts` (add a driver beside `local` and `supabase`) |
| Swap in a real database | `src/lib/store.ts` and the helpers in `src/lib/` that read it |

---

## Deploying

### A normal server or VPS — recommended
```bash
npm install
npm run build
npm start                 # behind nginx or Caddy
```
Changes made in the admin are saved to `.data/hairtie.json`. Back up that file
and `public/uploads/` along with it.

### Vercel and other serverless hosts
It deploys and runs, but the filesystem is read-only: the shop always starts from
the demo content, and anything changed in the admin is lost on the next restart
or redeploy. That is fine for showing the site to someone; it is not fine for
running a real shop.

To run a real shop on Vercel you need persistent storage — a database behind
`src/lib/store.ts`, and `MEDIA_DRIVER=supabase` for the images.

**Either way, turn on your host's password protection before sharing the URL**,
because `/admin` has no sign-in.

---

## Replacing the demo content

1. **Admin → Media** — upload the real photographs.
2. **Admin → Products** — edit the demo products, or delete them and add your
   own. Deleting is safe: a product that appears on a past order is archived
   instead, so order history stays readable.
3. **Admin → Categories** — rename, reorder, or add your own.
4. **Admin → Website Editor** — replace the banner images and headings.
5. **Admin → Store Settings** — your real address, phone, WhatsApp number and
   opening hours.

To start over completely, stop the server, delete `.data/`, and start it again.

---

## Marketplace readiness

Each product already stores what Amazon, Flipkart and Myntra ask for: SKU, brand,
category, title, description, images, MRP, selling price, stock, GST rate, HSN
code, weight, dimensions, material, colour, size, country of origin and free-form
attributes.

**No marketplace integration is implemented.** When one is added it can read this
data directly, without changing the shape of a product.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint |

See **[HANDOVER.md](./HANDOVER.md)** for the non-technical guide, and the split
between what the client manages, what needs a developer, and what costs money.
