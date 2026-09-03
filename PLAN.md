# SØRKYST — Technical Plan

## Product
Fundraising platform for a 500 ml hand wash refill pouch sold by sports clubs.
Chain: **Club → Team → Campaign → Seller → Order → Pickup → Delivery**.

## Stack
- Next.js 15 (App Router), TypeScript, Tailwind CSS 3
- Supabase (PostgreSQL + Auth + RLS), `@supabase/ssr` for cookie-based sessions
- Zod validation, React Hook Form on the public checkout
- `qrcode` for seller/pickup QR codes, Recharts for the club progress chart
- Vitest for unit tests
- Deployable to Vercel (no server-only filesystem dependencies)

## Architecture / layering
```
src/brand              brand config (name, tagline, product, colours) — single place to swap logo/imagery
src/lib/money.ts       integer-øre money primitives (no floats)
src/lib/finance.ts     all fundraising economics (VAT, club earning, SØRKYST revenue)
src/lib/payments/*     PaymentProvider abstraction + Mock and Vipps implementations
src/lib/auth/*         session + role guards (server-side authorization)
src/lib/supabase/*     browser / server (RLS, user JWT) / admin (service role) clients
src/lib/data/*         query modules per domain (campaigns, sellers, orders, pickups, admin)
src/lib/csv.ts         CSV generation for the three campaign exports
src/app/**             route handlers, server actions, pages
src/components/**      reusable presentational + form components
```
Rules: no business logic in components, no payment logic outside `lib/payments`,
no money arithmetic outside `lib/money.ts` / `lib/finance.ts`.

## Money
All amounts are **integer øre** (`199 NOK = 19900`). VAT rate is stored as integer
basis points (`vat_rate_bp = 2500` = 25%) so no floating point is used anywhere.
Rounding is half-up, applied once per order line.

Per order:
```
gross              = qty * unit_price_inc_vat
club_earning       = qty * club_earning_per_unit
sorkyst_inc_vat    = gross - club_earning
vat_amount         = round(sorkyst_inc_vat * bp / (10000 + bp))
sorkyst_ex_vat     = sorkyst_inc_vat - vat_amount
```

## Authorization
Two layers, both enforced:
1. **RLS** in PostgreSQL — every table has policies keyed on `profiles.role`,
   `club_admins`, `team_admins` and seller ownership. Dashboards read through the
   user-scoped client, so a leaked id cannot read another club's rows.
2. **Server guards** (`lib/auth/guards.ts`) — `requireRole`, `requireClubAccess`,
   `requireCampaignAccess`, `requireSellerAccess` run before any page renders.

The service-role client is used only in trusted paths: public checkout (insert
order), payment webhooks, campaign closing, CSV export and seeding.

## Payments
`PaymentProvider { createPayment, getPayment, refundPayment }`.
`MockPaymentProvider` (default, redirects straight to a mock confirm route) and
`VippsPaymentProvider` (ePayment API, env-driven, clearly marked TODOs where live
credentials are needed). Selected by `PAYMENT_PROVIDER` env var.
Every payment attempt is persisted to `payments` with the raw provider response.

## Routes
Public: `/`, `/s/[club]/[team]/[seller]`, `/order/[id]/success`
Seller: `/seller`
Club:   `/club`, `/club/campaigns/[campaignId]`, `/club/pickup/[campaignId]`
Admin:  `/admin`, `/admin/clubs`, `/admin/clubs/[clubId]`, `/admin/campaigns/[campaignId]`
API:    `/api/checkout`, `/api/payments/[provider]/callback`, `/api/payments/[provider]/webhook`,
        `/api/qr`, `/api/campaigns/[campaignId]/export/[type]`

## Build order
1. migrations + RLS → 2. auth/guards → 3. public sales + payments → 4. seller →
5. club → 6. pickup → 7. admin → 8. exports → 9. tests → 10. lint/build/README
