-- SØRKYST — row level security.
--
-- The public site is anonymous. It must be able to read the campaign
-- information an order page needs, and submit an order. Nothing else.
--
-- Order writes from the app go through the Next.js route handler using the
-- service role key, which bypasses RLS. These policies are defence in depth:
-- even if the anon key leaked, it could not list orders or read CRM data.

alter table organizations   enable row level security;
alter table products        enable row level security;
alter table campaigns       enable row level security;
alter table campaign_pricing enable row level security;
alter table volume_pricing  enable row level security;
alter table orders          enable row level security;
alter table order_items     enable row level security;
alter table order_counters  enable row level security;
alter table campaign_leads  enable row level security;

-- Start from nothing: Supabase grants broadly to anon by default.
revoke all on organizations, products, campaigns, campaign_pricing,
              volume_pricing, orders, order_items, order_counters, campaign_leads
  from anon, authenticated;

-- A campaign is publicly visible only while it is open for ordering. The check
-- is inlined in each policy rather than wrapped in a SECURITY DEFINER helper:
-- such a helper has to stay executable by anon for the policies to work, which
-- would expose it as a public RPC endpoint.

-- Products --------------------------------------------------------------------
-- Prices here are the published consumer and partner prices; they already
-- appear on the public marketing site.
grant select (id, name, sku, description, size_ml, consumer_price,
              default_partner_price, vat_rate, active, tagline,
              placeholder_tone, sort_order)
  on products to anon, authenticated;

drop policy if exists "public reads active products" on products;
create policy "public reads active products"
  on products for select
  to anon, authenticated
  using (active);

-- Organizations ---------------------------------------------------------------
-- Only the identifying fields an order page shows, and only for organizations
-- that actually have an open campaign. Contact details, address and status
-- stay private.
grant select (id, name, slug, city) on organizations to anon, authenticated;

drop policy if exists "public reads organizations with an open campaign" on organizations;
create policy "public reads organizations with an open campaign"
  on organizations for select
  to anon, authenticated
  using (
    exists (
      select 1 from campaigns c
      where c.organization_id = organizations.id
        and c.status in ('planned', 'active')
    )
  );

-- Campaigns -------------------------------------------------------------------
grant select (id, organization_id, name, slug, participants, target_profit,
              status, start_date, order_deadline, delivery_date)
  on campaigns to anon, authenticated;

drop policy if exists "public reads open campaigns" on campaigns;
create policy "public reads open campaigns"
  on campaigns for select
  to anon, authenticated
  using (status in ('planned', 'active'));

-- Agreed pricing --------------------------------------------------------------
-- A club may see its own agreed price; that is the whole point of the link.
grant select (id, campaign_id, product_id, partner_price, consumer_price,
              organization_margin)
  on campaign_pricing to anon, authenticated;

drop policy if exists "public reads pricing for open campaigns" on campaign_pricing;
create policy "public reads pricing for open campaigns"
  on campaign_pricing for select
  to anon, authenticated
  using (
    exists (
      select 1 from campaigns c
      where c.id = campaign_pricing.campaign_id
        and c.status in ('planned', 'active')
    )
  );

grant select (id, product_id, campaign_id, min_quantity, max_quantity,
              partner_price, label)
  on volume_pricing to anon, authenticated;

drop policy if exists "public reads volume pricing for open campaigns" on volume_pricing;
create policy "public reads volume pricing for open campaigns"
  on volume_pricing for select
  to anon, authenticated
  using (
    campaign_id is null
    or exists (
      select 1 from campaigns c
      where c.id = volume_pricing.campaign_id
        and c.status in ('planned', 'active')
    )
  );

-- Orders ----------------------------------------------------------------------
-- Insert only. There is deliberately no select policy, so no anonymous caller
-- can read back an order — its own included.
grant insert (organization_id, campaign_id, contact_name, email, phone,
              subtotal, vat, total, organization_profit, participants,
              notes, requested_delivery_date)
  on orders to anon, authenticated;

drop policy if exists "public submits orders" on orders;
create policy "public submits orders"
  on orders for insert
  to anon, authenticated
  with check (
    contact_name <> ''
    and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$'
    and subtotal >= 0
    and total >= 0
    and organization_profit >= 0
    and participants >= 0
  );

grant insert (order_id, product_id, quantity, unit_price, consumer_price,
              organization_margin, line_total)
  on order_items to anon, authenticated;

drop policy if exists "public submits order items" on order_items;
create policy "public submits order items"
  on order_items for insert
  to anon, authenticated
  with check (quantity > 0 and unit_price >= 0 and line_total >= 0);

-- order_counters is internal: no grants, no policies. Only the service role
-- and the security-definer function may touch it.

-- Enquiries from the marketing site -------------------------------------------
grant insert (organization_name, organization_type, contact_name, email, phone,
              city, participant_count, products_per_participant, profit_goal,
              estimated_products, estimated_profit, message, source)
  on campaign_leads to anon, authenticated;

drop policy if exists "public can submit leads" on campaign_leads;
create policy "public can submit leads"
  on campaign_leads for insert
  to anon, authenticated
  with check (organization_name <> '' and contact_name <> '' and email <> '');

-- The order number function writes to an internal counter table. It is created
-- SECURITY DEFINER with a pinned search_path in 0001; only the service role
-- may call it.
revoke all on function next_order_number(integer) from public, anon, authenticated;
