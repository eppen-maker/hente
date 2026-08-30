-- SØR° fundraising platform — core schema.
--
-- Mirrors the TypeScript domain model in src/types/index.ts.
-- Money is stored as numeric(12,2) in NOK. Partner and consumer prices are
-- stored INCLUSIVE of VAT (see PRICES_INCLUDE_VAT in src/lib/config/pricing.ts);
-- net amounts are derived when an order is written.

create extension if not exists "pgcrypto";

-- Reusable trigger for updated_at ---------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Organizations ---------------------------------------------------------------
create table if not exists organizations (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  organization_number text,
  slug                text not null unique,
  contact_name        text,
  email               text,
  phone               text,
  address             text,
  postal_code         text,
  city                text,
  status              text not null default 'lead'
                        check (status in ('lead', 'active', 'inactive')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create unique index if not exists organizations_org_number_key
  on organizations (organization_number)
  where organization_number is not null;

create index if not exists organizations_email_idx on organizations (lower(email));

drop trigger if exists organizations_set_updated_at on organizations;
create trigger organizations_set_updated_at
  before update on organizations
  for each row execute function set_updated_at();

-- Products --------------------------------------------------------------------
-- The catalogue is deliberately multi-product from day one.
create table if not exists products (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  sku                   text not null unique,
  description           text,
  size_ml               integer check (size_ml is null or size_ml > 0),
  consumer_price        numeric(12,2) not null check (consumer_price >= 0),
  default_partner_price numeric(12,2) not null check (default_partner_price >= 0),
  vat_rate              numeric(4,3) not null default 0.250 check (vat_rate >= 0 and vat_rate < 1),
  active                boolean not null default true,
  -- Presentation only; safe to ignore for pricing and ordering.
  tagline               text,
  placeholder_tone      text not null default 'sand',
  sort_order            integer not null default 0,
  created_at            timestamptz not null default now(),
  constraint products_partner_price_below_consumer
    check (default_partner_price <= consumer_price)
);

create index if not exists products_active_idx on products (active, sort_order);

-- Campaigns -------------------------------------------------------------------
create table if not exists campaigns (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name            text not null,
  slug            text not null unique,
  participants    integer not null default 0 check (participants >= 0),
  target_profit   numeric(12,2) check (target_profit is null or target_profit >= 0),
  status          text not null default 'draft'
                    check (status in ('draft', 'planned', 'active', 'completed', 'cancelled')),
  start_date      date,
  order_deadline  date,
  delivery_date   date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists campaigns_organization_idx on campaigns (organization_id);
create index if not exists campaigns_status_idx on campaigns (status);

drop trigger if exists campaigns_set_updated_at on campaigns;
create trigger campaigns_set_updated_at
  before update on campaigns
  for each row execute function set_updated_at();

-- Agreed pricing per campaign -------------------------------------------------
-- The margin is generated, so an agreed price and its margin can never drift.
create table if not exists campaign_pricing (
  id                  uuid primary key default gen_random_uuid(),
  campaign_id         uuid not null references campaigns (id) on delete cascade,
  product_id          uuid not null references products (id) on delete restrict,
  partner_price       numeric(12,2) not null check (partner_price >= 0),
  consumer_price      numeric(12,2) not null check (consumer_price >= 0),
  organization_margin numeric(12,2) generated always as (consumer_price - partner_price) stored,
  created_at          timestamptz not null default now(),
  unique (campaign_id, product_id),
  constraint campaign_pricing_margin_not_negative check (partner_price <= consumer_price)
);

-- Optional volume pricing -----------------------------------------------------
-- Nothing is seeded here. When no row matches, the campaign price (or the
-- product's default partner price) applies unchanged.
create table if not exists volume_pricing (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references products (id) on delete cascade,
  -- NULL campaign_id = a default tier for the product, for every campaign.
  campaign_id   uuid references campaigns (id) on delete cascade,
  min_quantity  integer not null check (min_quantity >= 0),
  max_quantity  integer check (max_quantity is null or max_quantity >= min_quantity),
  partner_price numeric(12,2) not null check (partner_price >= 0),
  label         text,
  created_at    timestamptz not null default now(),
  unique (product_id, campaign_id, min_quantity)
);

create index if not exists volume_pricing_lookup_idx
  on volume_pricing (product_id, campaign_id, min_quantity desc);

-- Human-readable order numbers ------------------------------------------------
-- SOR-2026-0001, restarting each year. The counter upsert is atomic, so
-- concurrent orders cannot collide.
create table if not exists order_counters (
  year        integer primary key,
  last_number integer not null default 0
);

create or replace function next_order_number(p_year integer default null)
returns text
language plpgsql
as $$
declare
  v_year integer := coalesce(p_year, extract(year from now())::integer);
  v_next integer;
begin
  insert into order_counters (year, last_number)
  values (v_year, 1)
  on conflict (year)
    do update set last_number = order_counters.last_number + 1
  returning last_number into v_next;

  return 'SOR-' || v_year::text || '-' || lpad(v_next::text, 4, '0');
end;
$$;

-- Orders ----------------------------------------------------------------------
create table if not exists orders (
  id                      uuid primary key default gen_random_uuid(),
  organization_id         uuid not null references organizations (id) on delete restrict,
  campaign_id             uuid references campaigns (id) on delete set null,
  order_number            text not null unique default next_order_number(),
  contact_name            text not null,
  email                   text not null,
  phone                   text,
  status                  text not null default 'received'
                            check (status in ('received', 'confirmed', 'in_production',
                                              'shipped', 'delivered', 'invoiced', 'cancelled')),
  -- All amounts are recalculated server-side before insert.
  subtotal                numeric(12,2) not null default 0 check (subtotal >= 0),
  vat                     numeric(12,2) not null default 0 check (vat >= 0),
  total                   numeric(12,2) not null default 0 check (total >= 0),
  organization_profit     numeric(12,2) not null default 0 check (organization_profit >= 0),
  participants            integer not null default 0 check (participants >= 0),
  notes                   text,
  requested_delivery_date date,
  -- Invoicing today, a payment provider later: nothing here needs to change
  -- when Stripe or Vipps is added.
  payment_status          text not null default 'not_required'
                            check (payment_status in ('not_required', 'pending', 'paid', 'refunded')),
  payment_provider        text,
  payment_reference       text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists orders_organization_idx on orders (organization_id);
create index if not exists orders_campaign_idx on orders (campaign_id);
create index if not exists orders_created_at_idx on orders (created_at desc);

drop trigger if exists orders_set_updated_at on orders;
create trigger orders_set_updated_at
  before update on orders
  for each row execute function set_updated_at();

-- Order items -----------------------------------------------------------------
create table if not exists order_items (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid not null references orders (id) on delete cascade,
  product_id          uuid not null references products (id) on delete restrict,
  quantity            integer not null check (quantity > 0),
  -- Price snapshots: what the organization pays and what it sells for.
  unit_price          numeric(12,2) not null check (unit_price >= 0),
  consumer_price      numeric(12,2) not null check (consumer_price >= 0),
  organization_margin numeric(12,2) not null,
  line_total          numeric(12,2) not null check (line_total >= 0),
  created_at          timestamptz not null default now()
);

create index if not exists order_items_order_idx on order_items (order_id);

-- Public enquiries from the marketing site ------------------------------------
create table if not exists campaign_leads (
  id                       uuid primary key default gen_random_uuid(),
  organization_name        text not null,
  organization_type        text not null default 'sports-club',
  contact_name             text not null,
  email                    text not null,
  phone                    text,
  city                     text,
  participant_count        integer not null default 0,
  products_per_participant integer,
  profit_goal              numeric(12,2),
  estimated_products       integer,
  estimated_profit         numeric(12,2),
  message                  text,
  source                   text not null default 'calculator',
  created_at               timestamptz not null default now()
);

create index if not exists campaign_leads_created_at_idx on campaign_leads (created_at desc);
