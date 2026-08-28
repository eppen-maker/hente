-- SØR° fundraising platform — initial schema.
-- Mirrors the TypeScript domain model in src/types/index.ts.

create extension if not exists "pgcrypto";

-- Price lists -----------------------------------------------------------------
create table if not exists pricing (
  id                  text primary key,
  name                text        not null,
  currency            text        not null default 'NOK',
  consumer_price      numeric(10,2) not null,
  organization_price  numeric(10,2) not null,
  vat_rate            numeric(4,3)  not null default 0.250,
  minimum_quantity    integer       not null default 0,
  valid_from          timestamptz,
  valid_to            timestamptz,
  created_at          timestamptz not null default now()
);

create table if not exists pricing_tiers (
  id                 uuid primary key default gen_random_uuid(),
  pricing_id         text not null references pricing(id) on delete cascade,
  min_quantity       integer not null,
  organization_price numeric(10,2) not null,
  label              text,
  unique (pricing_id, min_quantity)
);

-- Catalogue -------------------------------------------------------------------
create table if not exists products (
  id                uuid primary key default gen_random_uuid(),
  slug              text unique not null,
  name              text not null,
  tagline           text,
  description       text,
  category          text not null default 'refill',
  pricing_id        text references pricing(id),
  image_url         text,
  placeholder_tone  text not null default 'sand',
  is_active         boolean not null default true,
  created_at        timestamptz not null default now()
);

create table if not exists product_variants (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  name       text not null,
  size       text,
  scent      text
);

-- Organizations ---------------------------------------------------------------
create table if not exists organizations (
  id                  uuid primary key default gen_random_uuid(),
  slug                text unique not null,
  name                text not null,
  type                text not null default 'sports-club',
  organization_number text,
  city                text,
  participant_count   integer not null default 0,
  contact_name        text,
  contact_email       text,
  contact_phone       text,
  contact_role        text,
  pricing_id          text references pricing(id),
  created_at          timestamptz not null default now()
);

-- Campaigns -------------------------------------------------------------------
create table if not exists campaigns (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references organizations(id) on delete cascade,
  name                     text not null,
  status                   text not null default 'draft',
  goal_mode                text not null default 'products-per-participant',
  participant_count        integer not null default 0,
  products_per_participant integer,
  profit_goal              numeric(12,2),
  planned_products         integer not null default 0,
  pricing_id               text references pricing(id),
  starts_at                timestamptz,
  ends_at                  timestamptz,
  created_at               timestamptz not null default now()
);

-- Orders ----------------------------------------------------------------------
create table if not exists orders (
  id                        uuid primary key default gen_random_uuid(),
  organization_id           uuid not null references organizations(id) on delete cascade,
  campaign_id               uuid references campaigns(id) on delete set null,
  status                    text not null default 'draft',
  currency                  text not null default 'NOK',
  total_organization_cost   numeric(12,2) not null default 0,
  total_consumer_value      numeric(12,2) not null default 0,
  expected_profit           numeric(12,2) not null default 0,
  delivery_line1            text,
  delivery_line2            text,
  delivery_postal_code      text,
  delivery_city             text,
  delivery_country          text default 'NO',
  requested_delivery_date   date,
  note                      text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create table if not exists order_lines (
  id                        uuid primary key default gen_random_uuid(),
  order_id                  uuid not null references orders(id) on delete cascade,
  product_id                uuid references products(id),
  variant_id                uuid references product_variants(id),
  quantity                  integer not null check (quantity > 0),
  unit_organization_price   numeric(10,2) not null,
  unit_consumer_price       numeric(10,2) not null
);

-- Public enquiries from the website ------------------------------------------
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

-- Row level security: the public site only ever inserts leads.
alter table campaign_leads enable row level security;

drop policy if exists "public can submit leads" on campaign_leads;
create policy "public can submit leads"
  on campaign_leads for insert
  to anon
  with check (true);

-- Seed the standard price list so the app and the database agree.
insert into pricing (id, name, consumer_price, organization_price, vat_rate, minimum_quantity)
values
  ('pricing-standard-2026', 'Standard dugnadspris 2026', 200, 120, 0.250, 500),
  ('pricing-volume-2026',   'Volumavtale 2026',          200, 120, 0.250, 5000)
on conflict (id) do nothing;

insert into pricing_tiers (pricing_id, min_quantity, organization_price, label) values
  ('pricing-standard-2026', 0,     120, 'Standard'),
  ('pricing-volume-2026',   0,     120, 'Standard'),
  ('pricing-volume-2026',   5000,  118, 'Volum 5 000+'),
  ('pricing-volume-2026',   10000, 115, 'Volum 10 000+'),
  ('pricing-volume-2026',   20000, 112, 'Volum 20 000+')
on conflict (pricing_id, min_quantity) do nothing;
