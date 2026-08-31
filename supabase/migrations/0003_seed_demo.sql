-- SØRKYST — demo seed data.
--
-- DEMO DATA ONLY. Everything below is safe to delete before going live:
--   delete from campaign_pricing;
--   delete from campaigns;
--   delete from orders;            -- if any test orders were placed
--   delete from organizations where slug in ('sogne-fk','sogne-handball','randesund-fk');
--
-- The same fixtures exist in TypeScript at src/lib/data/demo/, so the app runs
-- with or without a database. Keep the two in sync while this is demo data.

-- Products --------------------------------------------------------------------
-- V1 orderable product. Prices are configurable per campaign in
-- campaign_pricing, and per volume in volume_pricing.
insert into products (
  name, sku, description, size_ml, consumer_price, default_partner_price,
  vat_rate, active, tagline, placeholder_tone, sort_order, image_url
)
values (
  'Håndsåpe Refill',
  'SOR-HANDSAPE-500',
  'Mild håndsåpe på refillpose. Fyller opp dispenseren i stedet for at den byttes ut.',
  500,
  200.00,
  120.00,
  0.250,
  true,
  'Påfyll til dispenseren du allerede har.',
  'sand',
  0,
  '/produkter/handsape-refill.webp'
)
on conflict (sku) do update set
  name                  = excluded.name,
  description           = excluded.description,
  size_ml               = excluded.size_ml,
  consumer_price        = excluded.consumer_price,
  default_partner_price = excluded.default_partner_price,
  vat_rate              = excluded.vat_rate,
  active                = excluded.active,
  tagline               = excluded.tagline,
  image_url             = excluded.image_url;

-- No volume_pricing rows are seeded on purpose: without a configured tier the
-- campaign price (or the product default) applies, and the UI shows no discount.

-- Organizations ---------------------------------------------------------------
insert into organizations (name, slug, city, status, contact_name, email)
values
  ('Søgne FK',        'sogne-fk',        'Søgne',      'active', 'Demo Kontakt', 'demo+sogne-fk@sorkyst.no'),
  ('Søgne Håndball',  'sogne-handball',  'Søgne',      'active', 'Demo Kontakt', 'demo+sogne-handball@sorkyst.no'),
  ('Randesund FK',    'randesund-fk',    'Kristiansand', 'active', 'Demo Kontakt', 'demo+randesund-fk@sorkyst.no')
on conflict (slug) do update set
  name   = excluded.name,
  city   = excluded.city,
  status = excluded.status;

-- Campaigns -------------------------------------------------------------------
insert into campaigns (
  organization_id, name, slug, participants, target_profit, status,
  start_date, order_deadline, delivery_date
)
select o.id, v.name, v.slug, v.participants, v.target_profit, 'active',
       v.start_date, v.order_deadline, v.delivery_date
from (values
  ('sogne-fk',       'Vårdugnad 2026',    'sogne-fk',       600, 500000.00, date '2026-09-01', date '2026-09-21', date '2026-10-05'),
  ('sogne-handball', 'Høstdugnad 2026',   'sogne-handball', 500, 250000.00, date '2026-09-15', date '2026-10-05', date '2026-10-19'),
  ('randesund-fk',   'Sesongdugnad 2026', 'randesund-fk',   900, null,       date '2026-09-01', date '2026-09-28', date '2026-10-12')
) as v (org_slug, name, slug, participants, target_profit, start_date, order_deadline, delivery_date)
join organizations o on o.slug = v.org_slug
on conflict (slug) do update set
  name           = excluded.name,
  participants   = excluded.participants,
  target_profit  = excluded.target_profit,
  status         = excluded.status,
  start_date     = excluded.start_date,
  order_deadline = excluded.order_deadline,
  delivery_date  = excluded.delivery_date;

-- Agreed pricing --------------------------------------------------------------
-- All demo campaigns run on the standard agreement: 200 kr out, 120 kr in.
insert into campaign_pricing (campaign_id, product_id, partner_price, consumer_price)
select c.id, p.id, p.default_partner_price, p.consumer_price
from campaigns c
cross join products p
where c.slug in ('sogne-fk', 'sogne-handball', 'randesund-fk')
  and p.sku = 'SOR-HANDSAPE-500'
on conflict (campaign_id, product_id) do update set
  partner_price  = excluded.partner_price,
  consumer_price = excluded.consumer_price;
