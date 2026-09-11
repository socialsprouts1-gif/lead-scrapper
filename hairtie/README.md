# Hairtie

A premium direct-to-consumer store for **Hairtie** — hair accessories, handbags and
everyday fashion pieces — with an admin panel and visual website editor built for
a non-technical owner to run without a developer.

```
Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4
PostgreSQL via Prisma 7 · Razorpay · Supabase Storage (optional)
```

---

## Quick start

```bash
cd hairtie
npm install
cp .env.example .env      # then fill in DATABASE_URL and AUTH_SECRET
npm run db:migrate        # create the tables
npm run db:seed           # demo catalogue, pages and the first admin account
npm run dev               # http://localhost:3000
```

The seed creates an admin account from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`
(default `admin@hairtie.in` / `hairtie1234`). **Change the password immediately
after the first sign-in.**

| Where | URL |
| --- | --- |
| Storefront | `/` |
| Admin panel | `/admin` |

---

## Environment variables

Everything configurable lives in `.env` — no key is ever hardcoded, and no secret
is exposed to the browser. See `.env.example` for the annotated list.

| Variable | Required | What it does |
| --- | --- | --- |
| `DATABASE_URL` | **yes** | PostgreSQL connection string (Supabase, Neon, RDS, self-hosted). |
| `AUTH_SECRET` | **yes in production** | Signs the login cookie. 32+ random characters. |
| `NEXT_PUBLIC_SITE_URL` | recommended | Public address, used for canonical URLs and the sitemap. Can also be set in Admin → Store Settings. |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | for online payment | Until both are set, checkout offers Cash on Delivery only. |
| `RAZORPAY_WEBHOOK_SECRET` | optional | Verifies Razorpay webhooks at `/api/payments/razorpay/webhook`. |
| `MEDIA_DRIVER` | optional | `local` (default) or `supabase`. |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_STORAGE_BUCKET` | for `supabase` driver | Where uploaded images are stored. |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | seed only | The first admin account. |

---

## What is built

### Storefront
Home, Shop (search, category / price / colour / tag / availability filters, five
sort orders), Categories, Product detail (gallery with zoom, swipeable on mobile,
variants, specifications, reviews, related and recently viewed), Cart, Checkout,
Order confirmation, Order tracking, Wishlist, Customer account (orders, addresses,
password), Contact, Store, About, FAQ, Privacy Policy, Terms, Shipping & Returns.

Mobile-first throughout: sticky header, a bottom navigation bar, swipeable product
images, a sticky add-to-bag bar on product pages and a WhatsApp button on every
screen.

### Admin panel
Dashboard · Orders · Products · Categories · Website Editor · Appearance · Media ·
Customers · Discounts · Reviews · Analytics · Store Settings.

### Visual website editor
Click any section — in the list or straight on the live preview — to edit it. Drag
to reorder, duplicate, hide or delete. Edits save as you type into a **draft**; the
public site only changes when you press **Publish**, and **Discard** restores the
last published version. Eighteen section types ship with it, from hero banners to
Instagram grids.

### Payments
Cash on Delivery works out of the box. Razorpay (UPI, cards, net banking, wallets)
activates as soon as the keys are present. Totals are always recalculated on the
server, stock is verified inside the order transaction, and payments are only
accepted after the Razorpay signature is verified.

### SEO
Per-product and per-page titles, descriptions, keywords, canonical URLs and Open
Graph images; Product, Store and Breadcrumb structured data; an automatic sitemap
and robots.txt.

---

## Project layout

```
hairtie/
├── prisma/
│   ├── schema.prisma          # the whole data model
│   ├── migrations/
│   └── seed.ts                # demo catalogue, pages, admin account
├── scripts/
│   └── generate-placeholders.mjs
├── public/images/             # generated demo imagery (replace with real photos)
└── src/
    ├── app/
    │   ├── (storefront)/      # everything a customer sees
    │   ├── admin/             # the shop manager
    │   ├── preview/[slug]/    # live draft preview used by the editor
    │   ├── api/               # media uploads, reviews, payments, invoices
    │   ├── actions/           # server actions (cart, checkout, auth, admin)
    │   ├── sitemap.ts · robots.ts
    │   └── globals.css        # design tokens for shop and admin
    ├── components/
    │   ├── storefront/ · sections/ · admin/ · ui/
    ├── lib/                   # db, auth, cart, orders, catalog, settings, seo…
    └── generated/prisma/      # Prisma client (generated, not committed)
```

### Where to change things

| To change | Edit |
| --- | --- |
| A new page-builder block | `src/lib/sections.ts` + a component in `src/components/sections/SectionRenderer.tsx` |
| Product fields | `prisma/schema.prisma`, then `src/components/admin/ProductForm.tsx` |
| Shipping or tax logic | `src/lib/cart.ts` and `src/lib/orders.ts` |
| Payment provider | `src/lib/razorpay.ts` and `src/app/api/payments/` |
| Image storage | `src/lib/storage.ts` (add a driver beside `local` and `supabase`) |

---

## Deploying

### Vercel (recommended)
1. Create a PostgreSQL database (Supabase, Neon or similar).
2. Import the repository and set the root directory to `hairtie`.
3. Add the environment variables above. On Vercel set `MEDIA_DRIVER=supabase`
   — Vercel's filesystem is read-only, so the `local` driver cannot keep uploads.
4. Deploy. `postinstall` runs `prisma generate`; run `npm run db:migrate` once
   against the production database, then `npm run db:seed` if you want the demo
   content.

### A normal server or VPS
`npm run build && npm start` behind nginx or Caddy. The `local` media driver is
fine here — back up `public/uploads` along with the database.

---

## Replacing the demo content

The demo catalogue exists so the site looks finished on day one. To swap it for
real Hairtie products:

1. **Admin → Media** — upload the real photographs.
2. **Admin → Products** — edit each demo product, or delete them and add your own.
   Deleting is safe: a product that appears on a past order is archived instead so
   order history stays readable.
3. **Admin → Categories** — rename, reorder, or add your own.
4. **Admin → Website Editor** — replace the banner images and headings.
5. **Admin → Store Settings** — your real address, phone, WhatsApp number and
   opening hours.

To clear the demo catalogue in one go:

```sql
DELETE FROM "Product" WHERE "sku" LIKE 'HT-%';
```

---

## Marketplace readiness

The product table already stores what Amazon, Flipkart and Myntra ask for: SKU,
brand, category, title, description, images, MRP, selling price, stock, GST rate,
HSN code, weight, dimensions, material, colour, size, country of origin and
free-form attributes.

**No marketplace integration is implemented.** When one is added it can read this
data directly and push listings without a schema change or a rebuild.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Apply migrations (production-safe) |
| `npm run db:push` | Sync the schema without a migration (development) |
| `npm run db:seed` | Demo catalogue, pages and admin account |
| `npm run db:studio` | Prisma Studio, a database browser |

See **[HANDOVER.md](./HANDOVER.md)** for the non-technical guide, and the split
between what the client manages, what needs a developer, and what costs money.
