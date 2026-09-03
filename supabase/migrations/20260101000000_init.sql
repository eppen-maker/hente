-- SØRKYST — initial schema
-- All money is stored as integer øre (199 NOK = 19900). VAT is basis points (2500 = 25%).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- enums
create type user_role        as enum ('SORKYST_ADMIN', 'CLUB_ADMIN', 'TEAM_ADMIN', 'SELLER');
create type campaign_status  as enum ('DRAFT', 'ACTIVE', 'CLOSED', 'PICKUP', 'COMPLETED');
create type order_status     as enum ('PENDING', 'PAID', 'CANCELLED', 'REFUNDED');
create type payment_status   as enum ('PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED');
create type pickup_status    as enum ('NOT_READY', 'READY', 'PICKED_UP');
create type delivery_status  as enum ('NOT_DELIVERED', 'DELIVERED');

-- ---------------------------------------------------------------- profiles
create table profiles (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid unique references auth.users(id) on delete cascade,
  first_name    text not null default '',
  last_name     text not null default '',
  email         text,
  phone         text,
  role          user_role not null default 'SELLER',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index profiles_auth_user_id_idx on profiles(auth_user_id);
create index profiles_role_idx on profiles(role);

-- ---------------------------------------------------------------- clubs
create table clubs (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  slug                text not null unique,
  organisation_number text,
  contact_name        text,
  contact_email       text,
  contact_phone       text,
  address             text,
  postal_code         text,
  city                text,
  active              boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------- teams
create table teams (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid not null references clubs(id) on delete cascade,
  name       text not null,
  slug       text not null,
  season     text,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  unique (club_id, slug)
);
create index teams_club_id_idx on teams(club_id);

-- ---------------------------------------------------------------- admin memberships
create table club_admins (
  profile_id uuid not null references profiles(id) on delete cascade,
  club_id    uuid not null references clubs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, club_id)
);
create index club_admins_club_id_idx on club_admins(club_id);

create table team_admins (
  profile_id uuid not null references profiles(id) on delete cascade,
  team_id    uuid not null references teams(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, team_id)
);
create index team_admins_team_id_idx on team_admins(team_id);

-- ---------------------------------------------------------------- campaigns
create table campaigns (
  id                    uuid primary key default gen_random_uuid(),
  club_id               uuid not null references clubs(id) on delete cascade,
  name                  text not null,
  slug                  text not null,
  description           text,
  start_date            date,
  end_date              date,
  sales_target_quantity integer not null default 0,
  sales_target_amount   bigint  not null default 0,        -- øre
  retail_price_inc_vat  bigint  not null default 19900,    -- øre
  club_earning_per_unit bigint  not null default 8000,     -- øre
  vat_rate_bp           integer not null default 2500,     -- basis points
  status                campaign_status not null default 'DRAFT',
  leaderboard_enabled   boolean not null default true,
  pickup_location       text,
  pickup_date           date,
  closed_at             timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (club_id, slug),
  constraint campaigns_price_positive check (retail_price_inc_vat > 0),
  constraint campaigns_earning_valid check (club_earning_per_unit >= 0 and club_earning_per_unit <= retail_price_inc_vat),
  constraint campaigns_vat_valid check (vat_rate_bp >= 0 and vat_rate_bp <= 10000)
);
create index campaigns_club_id_idx on campaigns(club_id);
create index campaigns_status_idx on campaigns(status);

create table campaign_teams (
  campaign_id uuid not null references campaigns(id) on delete cascade,
  team_id     uuid not null references teams(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (campaign_id, team_id)
);
create index campaign_teams_team_id_idx on campaign_teams(team_id);

-- ---------------------------------------------------------------- sellers
create table sellers (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references campaigns(id) on delete cascade,
  team_id      uuid not null references teams(id) on delete cascade,
  profile_id   uuid references profiles(id) on delete set null,
  first_name   text not null,
  last_name    text not null,
  slug         text not null,
  phone        text,
  email        text,
  seller_code  text not null unique,
  sales_target integer not null default 0,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  unique (campaign_id, team_id, slug)
);
create index sellers_campaign_id_idx on sellers(campaign_id);
create index sellers_team_id_idx on sellers(team_id);
create index sellers_profile_id_idx on sellers(profile_id);

-- ---------------------------------------------------------------- orders
create table orders (
  id                     uuid primary key default gen_random_uuid(),
  campaign_id            uuid not null references campaigns(id) on delete cascade,
  club_id                uuid not null references clubs(id) on delete cascade,
  team_id                uuid not null references teams(id) on delete cascade,
  seller_id              uuid not null references sellers(id) on delete cascade,

  customer_name          text not null,
  customer_email         text,
  customer_phone         text,

  quantity               integer not null check (quantity > 0),
  unit_price_inc_vat     bigint not null,
  gross_amount           bigint not null,
  club_earning_amount    bigint not null,
  sorkyst_amount_inc_vat bigint not null,
  vat_amount             bigint not null,
  sorkyst_revenue_ex_vat bigint not null,
  vat_rate_bp            integer not null,

  payment_provider       text not null default 'mock',
  payment_reference      text,
  payment_status         payment_status not null default 'PENDING',
  status                 order_status not null default 'PENDING',

  created_at             timestamptz not null default now(),
  paid_at                timestamptz,
  cancelled_at           timestamptz
);
create index orders_campaign_id_idx on orders(campaign_id);
create index orders_seller_id_idx on orders(seller_id);
create index orders_team_id_idx on orders(team_id);
create index orders_club_id_idx on orders(club_id);
create index orders_status_idx on orders(status);
create index orders_payment_reference_idx on orders(payment_reference);
create index orders_campaign_status_idx on orders(campaign_id, status);

-- ---------------------------------------------------------------- pickups
create table seller_pickups (
  id                uuid primary key default gen_random_uuid(),
  campaign_id       uuid not null references campaigns(id) on delete cascade,
  seller_id         uuid not null references sellers(id) on delete cascade,
  expected_quantity integer not null default 0,
  actual_quantity   integer,
  status            pickup_status not null default 'NOT_READY',
  pickup_code       text not null unique,
  picked_up_at      timestamptz,
  confirmed_by      uuid references profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  unique (campaign_id, seller_id)
);
create index seller_pickups_campaign_id_idx on seller_pickups(campaign_id);
create index seller_pickups_status_idx on seller_pickups(status);

-- ---------------------------------------------------------------- deliveries
create table order_deliveries (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null unique references orders(id) on delete cascade,
  seller_id    uuid not null references sellers(id) on delete cascade,
  status       delivery_status not null default 'NOT_DELIVERED',
  delivered_at timestamptz,
  created_at   timestamptz not null default now()
);
create index order_deliveries_seller_id_idx on order_deliveries(seller_id);

-- ---------------------------------------------------------------- payments
create table payments (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid not null references orders(id) on delete cascade,
  provider            text not null,
  provider_payment_id text,
  provider_reference  text,
  amount              bigint not null,          -- øre
  currency            text not null default 'NOK',
  status              payment_status not null default 'PENDING',
  raw_response        jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index payments_order_id_idx on payments(order_id);
create index payments_provider_reference_idx on payments(provider_reference);

-- ---------------------------------------------------------------- audit log
create table audit_log (
  id            uuid primary key default gen_random_uuid(),
  actor_user_id uuid references profiles(id) on delete set null,
  action        text not null,
  entity_type   text not null,
  entity_id     uuid,
  metadata      jsonb,
  created_at    timestamptz not null default now()
);
create index audit_log_entity_idx on audit_log(entity_type, entity_id);
create index audit_log_created_at_idx on audit_log(created_at desc);

-- ---------------------------------------------------------------- updated_at
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at  before update on profiles  for each row execute function set_updated_at();
create trigger clubs_updated_at     before update on clubs     for each row execute function set_updated_at();
create trigger campaigns_updated_at before update on campaigns for each row execute function set_updated_at();
create trigger payments_updated_at  before update on payments  for each row execute function set_updated_at();

-- ---------------------------------------------------------------- new auth user -> profile
create or replace function handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (auth_user_id, email, first_name, last_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'SELLER')
  )
  on conflict (auth_user_id) do update set email = excluded.email;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();
