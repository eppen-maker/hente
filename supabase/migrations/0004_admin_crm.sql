-- SØR° — internal CRM.
--
-- Adds what the admin area needs on top of the ordering schema: internal cost
-- price, organization-level pricing, deliveries, and an activity log.
-- Nothing here is readable by anonymous users (see the grants at the bottom).

-- Internal economics ----------------------------------------------------------
-- SØR°'s own landed cost per unit, excluding VAT. INTERNAL ONLY: never granted
-- to anon, never returned by a public query, never shown on a public page.
alter table products
  add column if not exists landed_cost_ex_vat numeric(12,2)
    check (landed_cost_ex_vat is null or landed_cost_ex_vat >= 0);

alter table products
  add column if not exists image_url text;

comment on column products.landed_cost_ex_vat is
  'INTERNAL: SØR° cost per unit ex VAT. Never expose publicly.';

-- Campaign and order lifecycle ------------------------------------------------
-- The CRM tracks a campaign further than the public site needs to.
alter table campaigns drop constraint if exists campaigns_status_check;
alter table campaigns add constraint campaigns_status_check
  check (status in ('draft', 'planned', 'active', 'ordered', 'in_production',
                    'ready_for_delivery', 'delivered', 'completed', 'cancelled'));

alter table orders drop constraint if exists orders_status_check;
alter table orders add constraint orders_status_check
  check (status in ('received', 'confirmed', 'in_production', 'packed',
                    'shipped', 'delivered', 'invoiced', 'cancelled'));

-- Organization-level pricing --------------------------------------------------
-- Sits between campaign pricing and the product default in the precedence
-- chain: campaign > organization > volume > default.
create table if not exists organization_pricing (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references organizations (id) on delete cascade,
  product_id          uuid not null references products (id) on delete cascade,
  partner_price       numeric(12,2) not null check (partner_price >= 0),
  consumer_price      numeric(12,2) not null check (consumer_price >= 0),
  organization_margin numeric(12,2) generated always as (consumer_price - partner_price) stored,
  note                text,
  created_at          timestamptz not null default now(),
  unique (organization_id, product_id),
  constraint organization_pricing_margin_not_negative check (partner_price <= consumer_price)
);

-- Internal notes on an organization -------------------------------------------
alter table organizations
  add column if not exists internal_notes text;

alter table organizations
  add column if not exists next_action text;

alter table organizations
  add column if not exists next_action_at date;

-- Deliveries ------------------------------------------------------------------
create table if not exists deliveries (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid not null references orders (id) on delete cascade,
  organization_id     uuid not null references organizations (id) on delete cascade,
  quantity            integer not null default 0 check (quantity >= 0),
  requested_date      date,
  confirmed_date      date,
  address             text,
  postal_code         text,
  city                text,
  status              text not null default 'not_planned'
                        check (status in ('not_planned', 'planned', 'in_transit', 'delivered')),
  tracking_reference  text,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (order_id)
);

create index if not exists deliveries_status_idx on deliveries (status, requested_date);

drop trigger if exists deliveries_set_updated_at on deliveries;
create trigger deliveries_set_updated_at
  before update on deliveries
  for each row execute function set_updated_at();

-- Activity log ----------------------------------------------------------------
-- One row per meaningful change. Status changes are written here automatically
-- by the application; notes and contact points will build on the same table.
create table if not exists activity_log (
  id              uuid primary key default gen_random_uuid(),
  entity_type     text not null check (entity_type in ('organization', 'campaign', 'order', 'delivery', 'product')),
  entity_id       uuid not null,
  organization_id uuid references organizations (id) on delete cascade,
  kind            text not null default 'note'
                    check (kind in ('note', 'status_change', 'created', 'updated', 'contact')),
  summary         text not null,
  detail          text,
  from_value      text,
  to_value        text,
  actor           text not null default 'system',
  created_at      timestamptz not null default now()
);

create index if not exists activity_log_entity_idx on activity_log (entity_type, entity_id, created_at desc);
create index if not exists activity_log_organization_idx on activity_log (organization_id, created_at desc);

-- Security --------------------------------------------------------------------
-- Every CRM table is internal. RLS on, no policies, no grants: only the
-- service role (and a future authenticated admin role) can read or write.
alter table organization_pricing enable row level security;
alter table deliveries           enable row level security;
alter table activity_log         enable row level security;

revoke all on organization_pricing, deliveries, activity_log from anon, authenticated;

-- Keep the internal cost out of the public column grant. Re-granting the
-- public columns explicitly makes the omission deliberate rather than implied.
revoke select on products from anon, authenticated;
grant select (id, name, sku, description, size_ml, consumer_price,
              default_partner_price, vat_rate, active, tagline,
              placeholder_tone, sort_order, image_url)
  on products to anon, authenticated;
