-- SØRKYST — handover during the campaign, invoiced campaigns, SMS receipts.
--
-- Three changes, driven by how the first clubs actually work:
--
--   1. Pickup used to depend on closing the campaign, because `seller_pickups`
--      rows were only created by the closing step. In practice a club hands
--      goods out continuously, so pickup records are now kept in step with paid
--      orders by a trigger and exist from the first order onward.
--   2. Some clubs would rather collect the money themselves (through their own
--      club system) and be invoiced by SØRKYST afterwards. `payment_mode` on a
--      campaign switches the customer flow from paying online to simply
--      registering the order.
--   3. Customers and sellers get an SMS receipt, and every message sent is
--      recorded so the club can see what went out.

-- ---------------------------------------------------------------- 1. live pickup
create or replace function public.random_pickup_code() returns text
language plpgsql as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- no I, O, 0, 1
  code text;
  i int;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from seller_pickups where pickup_code = code);
  end loop;
  return code;
end;
$$;

/** Keeps one seller's pickup record in step with their paid orders. */
create or replace function public.sync_seller_pickup(p_seller uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_campaign uuid;
  v_expected integer;
begin
  if p_seller is null then return; end if;
  select campaign_id into v_campaign from sellers where id = p_seller;
  if v_campaign is null then return; end if;

  select coalesce(sum(quantity), 0) into v_expected
  from orders where seller_id = p_seller and status = 'PAID';

  insert into seller_pickups (campaign_id, seller_id, expected_quantity, status, pickup_code)
  values (v_campaign, p_seller, v_expected,
          (case when v_expected > 0 then 'READY' else 'NOT_READY' end)::pickup_status,
          public.random_pickup_code())
  on conflict (campaign_id, seller_id) do update
    set expected_quantity = excluded.expected_quantity,
        status = (case
          when seller_pickups.status = 'PICKED_UP' then 'PICKED_UP'
          when excluded.expected_quantity > 0 then 'READY'
          else 'NOT_READY'
        end)::pickup_status;
end;
$$;

create or replace function public.orders_sync_pickup() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    perform public.sync_seller_pickup(old.seller_id);
    return old;
  end if;
  perform public.sync_seller_pickup(new.seller_id);
  if tg_op = 'UPDATE' and new.seller_id is distinct from old.seller_id then
    perform public.sync_seller_pickup(old.seller_id);
  end if;
  return new;
end;
$$;

drop trigger if exists orders_sync_pickup_trg on orders;
create trigger orders_sync_pickup_trg
  after insert or update of status, quantity, seller_id or delete on orders
  for each row execute function public.orders_sync_pickup();

-- A seller gets a pickup code the moment they are created, so the clubhouse
-- can always search them up.
create or replace function public.sellers_sync_pickup() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.sync_seller_pickup(new.id);
  return new;
end;
$$;

drop trigger if exists sellers_sync_pickup_trg on sellers;
create trigger sellers_sync_pickup_trg
  after insert on sellers
  for each row execute function public.sellers_sync_pickup();

do $$
declare r record;
begin
  for r in select id from sellers loop
    perform public.sync_seller_pickup(r.id);
  end loop;
end;
$$;

/** Confirms a handover. Checks campaign access itself and refuses a repeat. */
create or replace function public.confirm_seller_pickup(p_seller uuid, p_quantity integer)
returns json
language plpgsql security definer set search_path = public as $$
declare
  r_pickup seller_pickups%rowtype;
  v_profile uuid := public.current_profile_id();
begin
  select * into r_pickup from seller_pickups where seller_id = p_seller;
  if not found then
    perform public.sync_seller_pickup(p_seller);
    select * into r_pickup from seller_pickups where seller_id = p_seller;
    if not found then return json_build_object('error', 'NOT_FOUND'); end if;
  end if;

  if not public.has_campaign_access(r_pickup.campaign_id) then
    return json_build_object('error', 'FORBIDDEN');
  end if;

  if r_pickup.status = 'PICKED_UP' then
    return json_build_object('error', 'ALREADY_PICKED_UP', 'pickedUpAt', r_pickup.picked_up_at);
  end if;

  update seller_pickups
     set status = 'PICKED_UP',
         actual_quantity = coalesce(p_quantity, expected_quantity),
         picked_up_at = now(),
         confirmed_by = v_profile
   where id = r_pickup.id and status <> 'PICKED_UP';

  insert into audit_log (actor_user_id, action, entity_type, entity_id, metadata)
  values (v_profile, 'pickup.confirmed', 'seller_pickup', r_pickup.id,
          jsonb_build_object('sellerId', p_seller, 'quantity', coalesce(p_quantity, r_pickup.expected_quantity)));

  return json_build_object('ok', true, 'pickedUpAt', now());
end;
$$;

/** Reverses a confirmation made by mistake. */
create or replace function public.undo_seller_pickup(p_seller uuid)
returns json
language plpgsql security definer set search_path = public as $$
declare
  r_pickup seller_pickups%rowtype;
  v_profile uuid := public.current_profile_id();
begin
  select * into r_pickup from seller_pickups where seller_id = p_seller;
  if not found then return json_build_object('error', 'NOT_FOUND'); end if;
  if not public.has_campaign_access(r_pickup.campaign_id) then
    return json_build_object('error', 'FORBIDDEN');
  end if;

  update seller_pickups
     set status = (case when expected_quantity > 0 then 'READY' else 'NOT_READY' end)::pickup_status,
         actual_quantity = null, picked_up_at = null, confirmed_by = null
   where id = r_pickup.id;

  insert into audit_log (actor_user_id, action, entity_type, entity_id)
  values (v_profile, 'pickup.undone', 'seller_pickup', r_pickup.id);

  return json_build_object('ok', true);
end;
$$;

revoke all on function public.confirm_seller_pickup(uuid, integer) from public;
revoke all on function public.undo_seller_pickup(uuid) from public;
grant execute on function public.confirm_seller_pickup(uuid, integer) to authenticated;
grant execute on function public.undo_seller_pickup(uuid) to authenticated;

-- A club admin ticks off customer deliveries too, not only the seller.
drop policy if exists order_deliveries_update_club on order_deliveries;
create policy order_deliveries_update_club on order_deliveries for update
  using (exists (select 1 from orders o where o.id = order_deliveries.order_id and public.has_campaign_access(o.campaign_id)))
  with check (exists (select 1 from orders o where o.id = order_deliveries.order_id and public.has_campaign_access(o.campaign_id)));

-- ---------------------------------------------------------------- 2. invoiced campaigns
-- Run separately from the rest: PostgreSQL will not let a new enum value be
-- used in the same transaction that adds it.
--   alter type payment_status add value if not exists 'INVOICED';

do $$
begin
  if not exists (select 1 from pg_type where typname = 'payment_mode') then
    create type payment_mode as enum ('ONLINE', 'INVOICE');
  end if;
end;
$$;

alter table campaigns add column if not exists payment_mode payment_mode not null default 'ONLINE';

/**
 * Confirms an order on a campaign the club is invoiced for.
 *
 * No money moves online, so there is nothing to verify with a payment
 * provider — but the order still has to count toward the seller's total and
 * the pickup requirement. Only campaigns explicitly set to INVOICE mode can be
 * confirmed this way, so it cannot be used to skip payment on a normal one.
 */
create or replace function public.public_confirm_invoice_order(p_order_id uuid)
returns json
language plpgsql security definer set search_path = public as $$
declare
  r_order orders%rowtype;
  v_mode  payment_mode;
begin
  select * into r_order from orders where id = p_order_id;
  if not found then return json_build_object('error', 'NOT_FOUND'); end if;

  select payment_mode into v_mode from campaigns where id = r_order.campaign_id;
  if v_mode is distinct from 'INVOICE' then
    return json_build_object('error', 'NOT_INVOICE_CAMPAIGN');
  end if;

  if r_order.status = 'PAID' then
    return json_build_object('orderId', r_order.id, 'status', 'PAID');
  end if;

  update orders
     set status = 'PAID', payment_status = 'INVOICED', paid_at = now(), cancelled_at = null
   where id = p_order_id;

  insert into order_deliveries (order_id, seller_id, status)
  values (r_order.id, r_order.seller_id, 'NOT_DELIVERED')
  on conflict (order_id) do nothing;

  insert into audit_log (action, entity_type, entity_id, metadata)
  values ('order.invoiced', 'order', r_order.id, jsonb_build_object('quantity', r_order.quantity));

  return json_build_object('orderId', r_order.id, 'status', 'PAID');
end;
$$;

revoke all on function public.public_confirm_invoice_order(uuid) from public;
grant execute on function public.public_confirm_invoice_order(uuid) to anon, authenticated;

-- the sales page needs to know which flow to render
create or replace function public.public_seller_page(p_club text, p_team text, p_seller text)
returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'club',     json_build_object('id', cl.id, 'name', cl.name, 'slug', cl.slug),
    'team',     json_build_object('id', t.id, 'name', t.name, 'slug', t.slug),
    'campaign', json_build_object(
                  'id', ca.id, 'name', ca.name, 'status', ca.status,
                  'retail_price_inc_vat', ca.retail_price_inc_vat,
                  'club_earning_per_unit', ca.club_earning_per_unit,
                  'vat_rate_bp', ca.vat_rate_bp,
                  'payment_mode', ca.payment_mode,
                  'end_date', ca.end_date, 'pickup_location', ca.pickup_location),
    'seller',   json_build_object(
                  'id', s.id, 'first_name', s.first_name, 'last_name', s.last_name,
                  'slug', s.slug, 'sales_target', s.sales_target, 'active', s.active)
  )
  from sellers s
  join teams t      on t.id = s.team_id
  join clubs cl     on cl.id = t.club_id
  join campaigns ca on ca.id = s.campaign_id and ca.club_id = cl.id
  where cl.slug = p_club and cl.active
    and t.slug = p_team and t.active
    and s.slug = p_seller
  limit 1;
$$;

-- ---------------------------------------------------------------- 3. SMS
create table if not exists sms_messages (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid references orders(id) on delete set null,
  seller_id    uuid references sellers(id) on delete set null,
  campaign_id  uuid references campaigns(id) on delete set null,
  recipient    text not null,
  kind         text not null,
  body         text not null,
  provider     text not null default 'mock',
  provider_ref text,
  status       text not null default 'SENT',
  error        text,
  created_at   timestamptz not null default now()
);
create index if not exists sms_messages_order_id_idx on sms_messages(order_id);
create index if not exists sms_messages_campaign_id_idx on sms_messages(campaign_id);
alter table sms_messages enable row level security;

drop policy if exists sms_messages_select on sms_messages;
create policy sms_messages_select on sms_messages for select
  using (public.is_sorkyst_admin()
         or (campaign_id is not null and public.has_campaign_access(campaign_id))
         or (seller_id is not null and public.owns_seller(seller_id)));

/** Records an outgoing SMS. Reachable from the public checkout path too. */
create or replace function public.log_sms(
  p_order_id uuid, p_seller_id uuid, p_recipient text, p_kind text,
  p_body text, p_provider text, p_provider_ref text, p_status text, p_error text
) returns void
language plpgsql security definer set search_path = public as $$
declare v_campaign uuid;
begin
  select campaign_id into v_campaign from orders where id = p_order_id;
  if v_campaign is null and p_seller_id is not null then
    select campaign_id into v_campaign from sellers where id = p_seller_id;
  end if;

  insert into sms_messages (order_id, seller_id, campaign_id, recipient, kind, body, provider, provider_ref, status, error)
  values (p_order_id, p_seller_id, v_campaign, p_recipient, p_kind, p_body,
          coalesce(p_provider, 'mock'), p_provider_ref, coalesce(p_status, 'SENT'), p_error);
end;
$$;

revoke all on function public.log_sms(uuid, uuid, text, text, text, text, text, text, text) from public;
grant execute on function public.log_sms(uuid, uuid, text, text, text, text, text, text, text) to anon, authenticated;

/** Everything needed to compose the receipts for one order. */
create or replace function public.order_notification_context(p_order_id uuid)
returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'orderId', o.id,
    'quantity', o.quantity,
    'grossAmount', o.gross_amount,
    'clubEarningAmount', o.club_earning_amount,
    'status', o.status,
    'paymentStatus', o.payment_status,
    'customerName', o.customer_name,
    'customerPhone', o.customer_phone,
    'sellerId', s.id,
    'sellerFirstName', s.first_name,
    'sellerLastName', s.last_name,
    'sellerPhone', s.phone,
    'sellerTotal', (select coalesce(sum(o2.quantity), 0) from orders o2 where o2.seller_id = s.id and o2.status = 'PAID'),
    'teamName', t.name,
    'clubName', cl.name,
    'campaignName', ca.name,
    'paymentMode', ca.payment_mode,
    'pickupLocation', ca.pickup_location,
    'pickupCode', (select sp.pickup_code from seller_pickups sp where sp.seller_id = s.id)
  )
  from orders o
  join sellers s    on s.id = o.seller_id
  join teams t      on t.id = o.team_id
  join clubs cl     on cl.id = o.club_id
  join campaigns ca on ca.id = o.campaign_id
  where o.id = p_order_id;
$$;

revoke all on function public.order_notification_context(uuid) from public;
grant execute on function public.order_notification_context(uuid) to anon, authenticated;
