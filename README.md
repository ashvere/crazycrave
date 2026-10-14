# Crispy Crave

Food ordering and delivery platform for local kitchens in Pototan. One deployment serves three portals:

| Portal | Path | Who |
|--------|------|-----|
| **Storefront** | `/` | Customers: browse shops, order, track, rate, chat with the rider |
| **Rider app** | `/rider` (`/rider/login`, `/rider/apply`) | Delivery riders |
| **Staff portal** | `/admin` (`/admin/login`) | Platform admin and kitchen (shop) accounts |

Live: **https://crazycrave.vercel.app**

The production app is the **Next.js** project in [`web/`](web/). The PHP app at the repo root is the original version, kept for reference.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 15](https://nextjs.org) (App Router, Server Components, Server Actions) |
| UI | React 19, TypeScript 5, Bootstrap 5.3 + Bootstrap Icons (CDN), legacy CSS in `web/public/legacy/css`, Tailwind available |
| Backend | Supabase: Postgres with Row Level Security, Auth (email + password), Storage, Realtime (presence) |
| Supabase clients | `@supabase/supabase-js`, `@supabase/ssr` (cookie sessions) |
| PWA | `@ducanh2912/next-pwa` (installable, service worker) |
| Hosting | Vercel (root directory `web/`) |
| External | Open-Meteo (weather-based "Crispy Picks"), device camera / GPS in the browser |
| Legacy | PHP 8 + MySQL (`chicken_ordering.sql`), Docker Compose |

---

## Features

### Storefront (customers)
- Shop list and menus, guest cart, checkout (delivery or pickup, cash or GCash with reference number, scheduled delivery)
- Signup and login, profile with saved phone and payment details
- My orders, live order tracking, cancel while still allowed
- Printable **receipt** with a reference number (`KK-YYYYMMDD-000123`)
- Chat with the assigned rider; rate the food and the rider after delivery
- Weather-based picks, Crispy AI FAQ widget, phone-first layout with a bottom tab bar

### Rider app
- Apply with documents (photos are shrunk in the browser before upload); sign in once an admin approves
- Delivery queue, claim and update deliveries, map and navigation links
- Delivery proof photo from the camera (required)
- Earnings, stats, GPS tracking, alerts
- Chat with customers per order, and with **dispatch** (admin)

### Staff portal
**Platform admin**
- **Overview:** live storefront visitors (Realtime presence), sales today, orders in progress, average order value, estimated conversion, 7-day sales and revenue
- **Shops:** add, edit, hide and delete, with logo upload and an optional kitchen manager login
- **Orders:** list and detail, assign riders, change status, receipts
- **KDS** (kitchen display, all shops or one) and **POS** (counter sales with a cash keypad)
- **Menu:** items with photo upload and categories, turn on/off, delete
- **Riders:** review applications and documents, approve (for all shops or one), remove access, add riders directly
- **Messages** with riders, **Customers**, **Reviews**, **Stats**, per-shop **Earnings**
- **Kitchen ops:** Inventory, Waste log, Purchase orders, Recipes (completing an order deducts recipe ingredients automatically)

**Kitchen (shop) accounts** see the same tools limited to their own shop.

---

## Repository layout

```
web/                        Next.js app (deploy this)
  app/(store)/              Storefront routes
  app/rider/                Rider app routes
  app/admin/                Staff portal routes
  app/api/                  Route handlers (signup, cart, rider apply, visit tracking)
  components/               UI components (store/, rider/, admin/)
  lib/                      Data access, helpers, Supabase clients (lib/supabase/)
  public/                   Images, legacy CSS/JS, PWA assets
  scripts/                  seed-portal-users (dev admin + rider accounts)
supabase/
  migrations/               SQL migrations, run in order
  full-setup.sql            All migrations combined, for a new project
  email-templates/          Auth email HTML for the Supabase dashboard
admin/, rider/, app/, ...   Legacy PHP app (reference)
```

---

## Getting started (local)

Requirements: Node.js 20+ and a Supabase project.

```bash
cd web
cp .env.local.example .env.local   # then fill in the values
npm install
npm run dev                        # http://localhost:3000
```

### Environment variables (`web/.env.local`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Server-only key for admin actions, uploads, rider applications, POS, messaging. Never expose it to the browser. |
| `NEXT_PUBLIC_SITE_URL` | no | Canonical URL for auth email links |
| `SEED_ADMIN_PASSWORD`, `SEED_RIDER_PASSWORD` | no | Used by `npm run seed:users` (12+ characters) |
| `DISABLE_PWA` | no | Set to `1` to turn off the service worker |

### Database setup

**New project:** run `supabase/full-setup.sql` in the Supabase SQL Editor.

**Existing project:** run any migrations in `supabase/migrations/` that haven't been applied yet, in filename order. Recent ones:

| Migration | Adds |
|-----------|------|
| `…13_order_customer_phone.sql` | Customer phone on orders |
| `…14_order_ratings.sql` | Food and rider ratings |
| `…15_kitchen_ops.sql` | Inventory, recipes, waste, purchase orders, stock deduction trigger |
| `…16_rider_staff_messages.sql` | Rider ↔ admin messaging |

Pages that depend on a migration show a notice until it has been run.

**Storage buckets** (created automatically on first use): `rider-documents` and `delivery-proofs` (private), `shop-logos` and `menu-images` (public), `site-visits` (private; one empty file per visitor per day).

**Dev accounts:** `npm run seed:users` creates or resets `admin@crispy.com` and `rider@crispy.com` using the seed passwords from `.env.local`. Other staff and riders can be created from the staff portal.

### Scripts

| Command | Does |
|---------|------|
| `npm run dev` | Development server (Turbopack) |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run seed:users` | Seed dev admin + rider accounts |

---

## Deployment (Vercel)

1. Import the repo and set **Root Directory** to `web` (required).
2. Framework preset: Next.js. Leave Output Directory empty.
3. Add the environment variables above, **including `SUPABASE_SERVICE_ROLE_KEY`**.
4. In Supabase → Auth → URL Configuration, set the Site URL and Redirect URLs to the production (and preview) domains.

Every push to the production branch deploys automatically (about 90 seconds).

### Troubleshooting
- **Vercel `404 NOT_FOUND`:** Root Directory must be exactly `web`, and the latest deployment must be Ready.
- **Old pages or styles after a deploy:** hard refresh, or clear site data (the PWA caches). Legacy CSS/JS are versioned per deploy. As a last resort, set `DISABLE_PWA=1`.
- **Uploads failing:** Vercel limits request bodies to about 4.5 MB. Rider documents and delivery photos are resized in the browser to stay under it.

---

## Security notes
- Row Level Security is on for all tables. Signed-in users can only update their own display name. A trigger limits what customers and riders can change on orders.
- Privileged writes (approvals, POS, uploads, kitchen ops, messaging) run in server code with the service role, after checking the user's role and shop.
- Never commit `.env.local` or real passwords.

## License

No license file is included. Add one (e.g. MIT) to set terms for reuse.
