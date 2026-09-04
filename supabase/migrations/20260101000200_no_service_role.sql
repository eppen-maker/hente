-- SØRKYST — remove the need for a service-role key.
--
-- The application previously used the Supabase service-role key for three
-- kinds of work: public reads on the sales page, the public checkout write,
-- and back-office writes made after a server-side guard had run.
--
-- That key bypasses row level security entirely, so a single leak exposes
-- every club's customer data. This migration replaces it with:
--
--   1. `security definer` functions for the public paths, each returning a
--      deliberately narrow projection and validating its own input;
--   2. ordinary RLS write policies for back-office work, so those writes run
--      as the signed-in user and are constrained by the same rules as reads;
--   3. one narrowly-scoped secret for payment settlement, which is the only
--      write that has no user session behind it.
--
-- The application now runs with the anon key alone.

-- ---------------------------------------------------------------- secrets
create table app_secrets (
  name       text primary key,
  value      text not null,
  created_at timestamptz not null default now()
);
alter table app_secrets enable row level security;
revoke all on table app_secrets from anon, authenticated;
-- No policies and no grants: unreachable through the API. Only `security
-- definer` functions, which run as the table owner, can read it.

-- ---------------------------------------------------------------- public sales page
/**
 * Everything the public sales page may know about a seller.
 * No customer rows, no contact details, no totals.
 */
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

/**
 * Creates a pending order.
 *
 * Every amount is computed here from the campaign's own pricing — the caller
 * cannot influence what anything costs. Mirrors `src/lib/finance.ts`:
 *   gross   = quantity * retail_price_inc_vat
 *   club    = quantity * club_earning_per_unit
 *   sorkyst = gross - club
 *   vat     = round(sorkyst * bp / (10000 + bp))
 */
create or replace function public.public_create_order(
  p_club text, p_team text, p_seller text,
  p_quantity integer, p_customer_name text, p_customer_phone text,
  p_customer_email text, p_provider text
) returns json
language plpgsql security definer set search_path = public as $$
declare
  r_seller   sellers%rowtype;
  r_campaign campaigns%rowtype;
  r_team     teams%rowtype;
  r_club     clubs%rowtype;
  v_gross    bigint;
  v_club     bigint;
  v_sorkyst  bigint;
  v_vat      bigint;
  v_order_id uuid;
begin
  if p_quantity is null or p_quantity < 1 or p_quantity > 200 then
    return json_build_object('error', 'INVALID_QUANTITY');
  end if;
  if coalesce(length(btrim(p_customer_name)), 0) < 2 then
    return json_build_object('error', 'INVALID_NAME');
  end if;

  select s.* into r_seller
  from sellers s
  join teams t  on t.id = s.team_id
  join clubs cl on cl.id = t.club_id
  where cl.slug = p_club and t.slug = p_team and s.slug = p_seller
  limit 1;

  if not found then return json_build_object('error', 'NOT_FOUND'); end if;
  if not r_seller.active then return json_build_object('error', 'SELLER_INACTIVE'); end if;

  select * into r_campaign from campaigns where id = r_seller.campaign_id;
  select * into r_team     from teams     where id = r_seller.team_id;
  select * into r_club     from clubs     where id = r_team.club_id;

  if r_campaign.status <> 'ACTIVE' then
    return json_build_object('error', 'CAMPAIGN_CLOSED');
  end if;

  v_gross   := r_campaign.retail_price_inc_vat * p_quantity;
  v_club    := r_campaign.club_earning_per_unit * p_quantity;
  v_sorkyst := v_gross - v_club;
  v_vat     := round(v_sorkyst::numeric * r_campaign.vat_rate_bp / (10000 + r_campaign.vat_rate_bp));

  insert into orders (
    campaign_id, club_id, team_id, seller_id,
    customer_name, customer_email, customer_phone,
    quantity, unit_price_inc_vat, gross_amount, club_earning_amount,
    sorkyst_amount_inc_vat, vat_amount, sorkyst_revenue_ex_vat, vat_rate_bp,
    payment_provider, payment_status, status
  ) values (
    r_campaign.id, r_club.id, r_team.id, r_seller.id,
    btrim(p_customer_name), nullif(btrim(coalesce(p_customer_email, '')), ''), p_customer_phone,
    p_quantity, r_campaign.retail_price_inc_vat, v_gross, v_club,
    v_sorkyst, v_vat, v_sorkyst - v_vat, r_campaign.vat_rate_bp,
    coalesce(p_provider, 'mock'), 'PENDING', 'PENDING'
  ) returning id into v_order_id;

  return json_build_object(
    'orderId', v_order_id,
    'grossAmount', v_gross,
    'clubEarningAmount', v_club,
    'sorkystAmountIncVat', v_sorkyst,
    'vatAmount', v_vat,
    'sorkystRevenueExVat', v_sorkyst - v_vat
  );
end;
$$;

/**
 * Receipt for a single order, addressed by its unguessable id.
 * Returns no other customer's data and no contact details.
 */
create or replace function public.public_order_confirmation(p_order_id uuid)
returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'id', o.id,
    'quantity', o.quantity,
    'grossAmount', o.gross_amount,
    'clubEarningAmount', o.club_earning_amount,
    'status', o.status,
    'sellerFirstName', s.first_name,
    'sellerLastName', s.last_name,
    'teamName', t.name,
    'clubName', cl.name,
    'campaignName', ca.name,
    'pickupLocation', ca.pickup_location
  )
  from orders o
  join sellers s    on s.id = o.seller_id
  join teams t      on t.id = o.team_id
  join clubs cl     on cl.id = o.club_id
  join campaigns ca on ca.id = o.campaign_id
  where o.id = p_order_id;
$$;

/** Records the payment attempt handed back by the provider. */
create or replace function public.public_register_payment(
  p_order_id uuid, p_provider text, p_provider_payment_id text, p_status payment_status, p_raw jsonb
) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into payments (order_id, provider, provider_payment_id, provider_reference, amount, currency, status, raw_response)
  select p_order_id, p_provider, p_provider_payment_id, p_order_id::text, o.gross_amount, 'NOK', p_status, p_raw
  from orders o where o.id = p_order_id;

  update orders set payment_reference = p_provider_payment_id where id = p_order_id;
end;
$$;

/** Marks a pending order as failed when the provider could not be reached. */
create or replace function public.public_fail_order(p_order_id uuid)
returns void
language sql security definer set search_path = public as $$
  update orders
     set status = 'CANCELLED', payment_status = 'FAILED', cancelled_at = now()
   where id = p_order_id and status = 'PENDING';
$$;

-- ---------------------------------------------------------------- settlement
/**
 * Applies a verified payment result to an order.
 *
 * There is no user session behind a payment callback or webhook, so this is
 * the one path guarded by a shared secret rather than by RLS. The secret is
 * held in `app_secrets` and never leaves the server. Idempotent: a paid order
 * is never downgraded, and repeating the same outcome is a no-op.
 */
create or replace function public.settle_order(
  p_secret text, p_order_id uuid, p_provider text, p_provider_payment_id text, p_status payment_status
) returns json
language plpgsql security definer set search_path = public as $$
declare
  r_order       orders%rowtype;
  v_order_state order_status;
  v_now         timestamptz := now();
begin
  if p_secret is null or p_secret <> (select value from app_secrets where name = 'server_secret') then
    return json_build_object('error', 'FORBIDDEN');
  end if;

  select * into r_order from orders where id = p_order_id;
  if not found then return json_build_object('error', 'NOT_FOUND'); end if;

  v_order_state := case p_status
    when 'PENDING'    then 'PENDING'
    when 'AUTHORIZED' then 'PAID'
    when 'CAPTURED'   then 'PAID'
    when 'FAILED'     then 'CANCELLED'
    when 'REFUNDED'   then 'REFUNDED'
  end::order_status;

  -- never downgrade a paid order
  if r_order.status = 'PAID' and v_order_state = 'PENDING' then
    return json_build_object('orderId', r_order.id, 'status', r_order.status);
  end if;

  update orders set
    payment_status    = p_status,
    status            = v_order_state,
    payment_reference = coalesce(p_provider_payment_id, payment_reference),
    paid_at           = case when v_order_state = 'PAID' then coalesce(paid_at, v_now) else null end,
    cancelled_at      = case when v_order_state = 'CANCELLED' then v_now else null end
  where id = p_order_id;

  update payments set status = p_status, provider_payment_id = coalesce(p_provider_payment_id, provider_payment_id)
  where order_id = p_order_id;

  if v_order_state = 'PAID' then
    insert into order_deliveries (order_id, seller_id, status)
    values (r_order.id, r_order.seller_id, 'NOT_DELIVERED')
    on conflict (order_id) do nothing;
  end if;

  insert into audit_log (action, entity_type, entity_id, metadata)
  values ('payment.' || lower(p_status::text), 'order', r_order.id,
          jsonb_build_object('provider', p_provider, 'providerPaymentId', p_provider_payment_id));

  return json_build_object('orderId', r_order.id, 'status', v_order_state);
end;
$$;

/** Resolves a provider reference back to an order id. */
create or replace function public.settle_lookup_order(p_secret text, p_reference text)
returns uuid
language sql stable security definer set search_path = public as $$
  select o.id from orders o
  where p_secret = (select value from app_secrets where name = 'server_secret')
    and (o.id::text = p_reference or o.payment_reference = p_reference)
  limit 1;
$$;

-- ---------------------------------------------------------------- grants
revoke all on function public.public_seller_page(text, text, text) from public;
revoke all on function public.public_create_order(text, text, text, integer, text, text, text, text) from public;
revoke all on function public.public_order_confirmation(uuid) from public;
revoke all on function public.public_register_payment(uuid, text, text, payment_status, jsonb) from public;
revoke all on function public.public_fail_order(uuid) from public;
revoke all on function public.settle_order(text, uuid, text, text, payment_status) from public;
revoke all on function public.settle_lookup_order(text, text) from public;

grant execute on function public.public_seller_page(text, text, text) to anon, authenticated;
grant execute on function public.public_create_order(text, text, text, integer, text, text, text, text) to anon, authenticated;
grant execute on function public.public_order_confirmation(uuid) to anon, authenticated;
grant execute on function public.public_register_payment(uuid, text, text, payment_status, jsonb) to anon, authenticated;
grant execute on function public.public_fail_order(uuid) to anon, authenticated;
grant execute on function public.settle_order(text, uuid, text, text, payment_status) to anon, authenticated;
grant execute on function public.settle_lookup_order(text, text) to anon, authenticated;

-- ---------------------------------------------------------------- write policies
-- Back-office writes now run as the signed-in user, under the same access
-- rules as the corresponding reads.

create policy clubs_write_admin on clubs for all
  using (public.is_sorkyst_admin()) with check (public.is_sorkyst_admin());

create policy teams_write_admin on teams for all
  using (public.is_sorkyst_admin()) with check (public.is_sorkyst_admin());

create policy club_admins_write on club_admins for all
  using (public.is_sorkyst_admin()) with check (public.is_sorkyst_admin());

create policy team_admins_write on team_admins for all
  using (public.is_sorkyst_admin()) with check (public.is_sorkyst_admin());

create policy campaigns_insert on campaigns for insert
  with check (public.is_sorkyst_admin());
create policy campaigns_update on campaigns for update
  using (public.has_club_access(club_id)) with check (public.has_club_access(club_id));
create policy campaigns_delete on campaigns for delete
  using (public.is_sorkyst_admin());

create policy campaign_teams_write on campaign_teams for all
  using (public.is_sorkyst_admin()) with check (public.is_sorkyst_admin());

create policy sellers_insert on sellers for insert
  with check (public.has_campaign_access(campaign_id));
create policy sellers_update on sellers for update
  using (public.has_campaign_access(campaign_id)) with check (public.has_campaign_access(campaign_id));
create policy sellers_delete on sellers for delete
  using (public.is_sorkyst_admin());

create policy seller_pickups_insert on seller_pickups for insert
  with check (public.has_campaign_access(campaign_id));

-- Any signed-in user may append to the audit log, but only as themselves.
create policy audit_log_insert on audit_log for insert
  with check (actor_user_id is null or actor_user_id = public.current_profile_id());
