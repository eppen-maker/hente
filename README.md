# SØRKYST

Fundraising platform for **SØRKYST** — a 500 ml hand wash refill pouch sold by
Norwegian sports clubs, teams and individual sellers.

Sellers get a personal sales page (`/s/sogne-fk/g2013/johannes-hansen`) and a QR
code. Customers pay SØRKYST digitally. The club earns a fixed amount per pouch.
When the campaign closes, the system computes exactly how many products each
seller must collect at the clubhouse, and the pickup is confirmed on a phone.

- **Stack** — Next.js 15 (App Router), TypeScript, Tailwind CSS, Supabase
  (PostgreSQL + Auth + RLS), Zod, React Hook Form, Vitest.
- **Money** — every amount is an integer number of øre. No floating point.
- **Authorization** — enforced twice: PostgreSQL RLS policies *and* server-side
  guards. Hiding navigation is never the security model.

---

## 1. Installation

```bash
npm install
cp .env.example .env.local     # fill in the values from step 2
npm run dev                    # http://localhost:3000
```

Node 20 or newer.

## 2. Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. **Project Settings → API** gives you three values:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` secret → `SUPABASE_SERVICE_ROLE_KEY` (server only, never
     ship it to the browser)
3. **Authentication → Providers → Email**: enable email/password. Magic links
   work too — the login page offers both, and `/auth/callback` exchanges the code.
4. **Authentication → URL Configuration**: add `http://localhost:3000/auth/callback`
   and your production `https://…/auth/callback` as redirect URLs.

### Database migrations

The migrations live in `supabase/migrations/` and are plain SQL.

**With the Supabase CLI (recommended):**

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

**Or from the dashboard:** open the SQL editor and run the files in order:

1. `supabase/migrations/20260101000000_init.sql` — enums, tables, indexes,
   foreign keys, `updated_at` triggers and the `auth.users → profiles` trigger.
2. `supabase/migrations/20260101000100_rls.sql` — helper functions and every
   row-level-security policy.

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Browser/SSR client (RLS applies) |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Server-only client for checkout, webhooks, campaign closing, exports, seeding |
| `NEXT_PUBLIC_APP_URL` | yes in production | Absolute base URL used for seller links, QR codes and payment return URLs |
| `PAYMENT_PROVIDER` | no (default `mock`) | `mock` or `vipps` |
| `VIPPS_API_BASE_URL` | vipps only | `https://apitest.vipps.no` or `https://api.vipps.no` |
| `VIPPS_CLIENT_ID` | vipps only | Client ID for the sales unit |
| `VIPPS_CLIENT_SECRET` | vipps only | Client secret |
| `VIPPS_SUBSCRIPTION_KEY` | vipps only | `Ocp-Apim-Subscription-Key` |
| `VIPPS_MERCHANT_SERIAL_NUMBER` | vipps only | Merchant serial number (MSN) |
| `VIPPS_WEBHOOK_SECRET` | vipps only | Webhook signature secret |
| `DEMO_PASSWORD` | no | Password for seeded demo users (default `sorkyst2026`) |

## 3. Creating the first administrator

```bash
npm run create-admin -- ida@sorkyst.no "a-strong-password" Ida Kristiansen
```

This creates a confirmed Supabase auth user and a `profiles` row with role
`SORKYST_ADMIN`. Sign in at `/login` and you land on `/admin`.

Other roles are created the same way (or through Supabase Auth) and then linked:

- `CLUB_ADMIN` → add a row in `club_admins (profile_id, club_id)`
- `TEAM_ADMIN` → add a row in `team_admins (profile_id, team_id)`
- `SELLER` → set `sellers.profile_id` to the seller's profile

## 4. Demo data

```bash
npm run seed
```

Creates Søgne FK (G2013, J2013, G2014, J2014 · *Høstdugnad 2026*) and Våg FK
(*Vårdugnad 2026*), sellers, paid orders and deliveries — including Johannes
Hansen with Kari Olsen (2), Per Hansen (1) and Anne Olsen (3) = 6 products and
480 kr earned for the club. It also creates three demo logins (password
`sorkyst2026`):

| Login | Role | Lands on |
| --- | --- | --- |
| `admin@sorkyst.no` | SØRKYST admin | `/admin` |
| `klubb@sognefk.no` | Club admin | `/club` |
| `johannes@example.com` | Seller | `/seller` |

Johannes' public sales page: `/s/sogne-fk/g2013/johannes-hansen`

Re-running the seed replaces only the two demo clubs.

## 5. Routes

**Public**

| Route | Purpose |
| --- | --- |
| `/` | Marketing front page |
| `/s/[club]/[team]/[seller]` | Seller's sales page and checkout |
| `/order/[id]/success` | Receipt / thank-you page |
| `/login`, `/auth/callback` | Authentication |

**Seller** — `/seller`: progress against target, products sold, money raised,
customer list with *mark as delivered*, personal link + QR, pickup code.

**Club** (`CLUB_ADMIN`, `TEAM_ADMIN`, `SORKYST_ADMIN`)

| Route | Purpose |
| --- | --- |
| `/club` | Campaign cards with totals and progress |
| `/club/campaigns/[campaignId]` | Team breakdown, seller table with filters and search, leaderboards, campaign closing, CSV exports |
| `/club/pickup/[campaignId]` | Clubhouse pickup mode (search, QR scan, confirm, duplicate protection) |

**SØRKYST admin** (`SORKYST_ADMIN`)

| Route | Purpose |
| --- | --- |
| `/admin` | Company-wide metrics and club leaderboard |
| `/admin/clubs` | Club list + create club |
| `/admin/clubs/[clubId]` | Edit club, add teams, import teams CSV, create campaign |
| `/admin/campaigns/[campaignId]` | Campaign settings, participating teams, seller links/QR, create seller, import sellers CSV, seller targets |

**API**

| Route | Purpose |
| --- | --- |
| `POST /api/checkout` | Creates the order and returns the provider redirect URL |
| `GET /api/payments/[provider]/callback` | Customer return; re-reads the payment before settling |
| `POST /api/payments/[provider]/webhook` | Provider webhook |
| `GET /api/qr?data=…&size=…` | SVG QR code |
| `GET /api/campaigns/[campaignId]/export/[type]` | `packing-list`, `delivery-list`, `settlement` CSV |

## 6. Payment architecture

Nothing outside `src/lib/payments/` knows how payments work. The contract is:

```ts
interface PaymentProvider {
  createPayment(input): Promise<CreatePaymentResult>;
  getPayment(providerPaymentId): Promise<PaymentSnapshot>;
  refundPayment(input): Promise<RefundResult>;
  parseWebhook(body, headers): Promise<WebhookEvent | null>;
}
```

- `MockPaymentProvider` (default) redirects straight to the internal callback
  and captures the payment — the full flow works without any credentials.
- `VippsPaymentProvider` implements the Vipps ePayment v1 API.

Switch with `PAYMENT_PROVIDER=mock|vipps`. Every attempt is persisted in
`payments` with the raw provider response, and `src/lib/data/payments.ts` is the
only place an order's status changes.

### Where Vipps credentials go

`.env.local` (and Vercel project environment variables):

```
PAYMENT_PROVIDER=vipps
VIPPS_API_BASE_URL=https://apitest.vipps.no
VIPPS_CLIENT_ID=…
VIPPS_CLIENT_SECRET=…
VIPPS_SUBSCRIPTION_KEY=…
VIPPS_MERCHANT_SERIAL_NUMBER=…
VIPPS_WEBHOOK_SECRET=…
```

Get them from [portal.vipps.no](https://portal.vipps.no) → *Utvikler* → the sales
unit's test and production keys.

### How webhooks should work

1. Register the webhook with Vipps (Webhooks API) pointing at
   `https://<your-domain>/api/payments/vipps/webhook`, subscribing to
   `epayments.payment.authorized.v1`, `.captured.v1`, `.aborted.v1`,
   `.expired.v1`, `.refunded.v1`. Store the returned secret in
   `VIPPS_WEBHOOK_SECRET`.
2. Vipps POSTs the event. `VippsPaymentProvider.parseWebhook` maps it to
   `{ providerPaymentId, providerReference, status }`.
3. The route looks the order up by reference and calls
   `verifyAndSettleOrder`, which **re-reads the payment from the Vipps API**
   before writing. A forged or replayed body therefore cannot mark an order paid.
4. Settling is idempotent, so the webhook and the customer redirect can race
   safely. A paid order is never downgraded.

**Remaining work for a real Vipps integration** (marked `TODO(vipps)` in the code):

- Verify the webhook HMAC signature (`Authorization` / `X-Ms-Date` /
  `X-Ms-Content-Sha256`) in `parseWebhook` before parsing.
- Decide capture strategy: the current flow treats `AUTHORIZED` as paid. If you
  reserve first and capture at delivery, call `capture` from the campaign-closing
  step instead.
- Run the Vipps test-environment checklist (test MSN, test app, `userFlow`
  variants for mobile vs. desktop).
- Wire refunds to an admin action — `refundPayment` is implemented but not yet
  exposed in the UI.

## 7. Money and fundraising economics

`src/lib/finance.ts` is the only place money is split:

```
gross            = quantity × retail_price_inc_vat
club_earning     = quantity × club_earning_per_unit
sorkyst_inc_vat  = gross − club_earning
vat              = round(sorkyst_inc_vat × bp / (10 000 + bp))
sorkyst_ex_vat   = sorkyst_inc_vat − vat
```

Defaults (configurable per campaign): 199 kr inc. VAT, 80 kr to the club, 25 % VAT.

1 000 products → 199 000 kr customer sales · 80 000 kr to the club ·
119 000 kr to SØRKYST inc. VAT · 23 800 kr VAT · 95 200 kr revenue ex. VAT.

Amounts are stored as integer øre (`199 kr = 19900`) and the VAT rate as basis
points (`vat_rate_bp = 2500`), so no rounding drift can accumulate.

## 8. Database tables

`profiles`, `clubs`, `teams`, `club_admins`, `team_admins`, `campaigns`,
`campaign_teams`, `sellers`, `orders`, `seller_pickups`, `order_deliveries`,
`payments`, `audit_log`.

Enums: `user_role`, `campaign_status`, `order_status`, `payment_status`,
`pickup_status`, `delivery_status`.

### Privacy

- Public URLs expose no customer data — the sales page reads a narrow
  projection (club, team, seller name, campaign pricing) and nothing else.
- A seller sees only customers who bought through their own link.
- A club admin sees only their own club; a team admin only their teams.
- Only `SORKYST_ADMIN` sees everything.

These rules are enforced by RLS policies, verified against PostgreSQL: a club
admin querying `orders` gets only their own club's rows, a seller only their
own, and an unauthenticated session gets nothing.

## 9. Campaign closing

*Avslutt dugnaden* on the campaign page:

1. Sets the campaign to `PICKUP`, which blocks new orders.
2. Computes the paid quantity per seller and creates/refreshes
   `seller_pickups` with a unique pickup code and status `READY`.
3. Shows the total product requirement for the warehouse.

Then three CSV exports (semicolon-separated, UTF-8 BOM, Excel-friendly):

| Export | Columns |
| --- | --- |
| Warehouse packing list | Seller, Team, Quantity, Pickup code |
| Customer delivery list | Seller, Team, Customer, Quantity, Phone, Email |
| Financial settlement | Club, Team, Quantity, Gross sales, Club earning, SØRKYST share, VAT, Revenue ex. VAT |

Pickup mode (`/club/pickup/[campaignId]`) searches by name or pickup code,
optionally scans a QR code with the device camera, shows the seller's order
list and total, requires a second confirmation, then records the timestamp and
the administrator who confirmed. A second attempt shows a large
**ALLEREDE HENTET** warning with the original date and time.

## 10. CSV imports

**Teams** (`/admin/clubs/[clubId]` → Lag):

```csv
navn;sesong
G2013;2026
J2014;2026
```

**Sellers** (`/admin/campaigns/[campaignId]` → Selgere):

```csv
fornavn;etternavn;lag;telefon;epost;mal
Johannes;Hansen;G2013;90000000;;5
```

English headers (`name`, `first_name`, `last_name`, `team`, `phone`, `email`,
`target`) work too, as do comma-separated files.

## 11. Tests, lint, build

```bash
npm test        # Vitest — VAT, club earnings, SØRKYST revenue, seller and
                # campaign totals, pickup quantities, CSV, slugs, validation
npm run lint
npm run typecheck
npm run build
```

## 12. Deploying to Vercel

1. Push the repository and import it in Vercel (framework preset: Next.js —
   no build settings needed).
2. Add the environment variables from the table above, including
   `NEXT_PUBLIC_APP_URL=https://your-domain` and the Supabase keys. Mark
   `SUPABASE_SERVICE_ROLE_KEY` as a server-side (non-public) variable.
3. Deploy, then add `https://your-domain/auth/callback` to the Supabase
   redirect URLs.
4. Point the Vipps webhook at `https://your-domain/api/payments/vipps/webhook`.
5. Run the migrations against the production project
   (`npx supabase db push`) before the first real campaign.

## 13. Project layout

```
src/brand/          brand config — swap logo, product copy and pricing defaults
src/lib/money.ts    integer-øre primitives
src/lib/finance.ts  fundraising economics (the only place money is split)
src/lib/pickup.ts   pickup requirement arithmetic
src/lib/payments/   PaymentProvider contract, Mock and Vipps implementations
src/lib/auth/       session + role/club/campaign guards
src/lib/supabase/   browser, server (RLS) and service-role clients
src/lib/data/       query modules per domain
src/lib/csv.ts      CSV reader/writer
src/app/            routes, server actions, route handlers
src/components/     reusable UI
src/test/           unit tests
supabase/migrations schema and RLS
scripts/            seed and create-admin
```

Replacing the placeholder logo, product photo or pricing defaults is a one-file
change in `src/brand/brand.config.ts`.

---

The repository also contains an unrelated iCloud mail report script
(`icloud_mail_report.py`); its documentation moved to
[`docs/icloud-mail-report.md`](docs/icloud-mail-report.md).
