-- SØRKYST — row level security
-- Reads for dashboards go through the user-scoped client and are constrained here.
-- Writes that need cross-tenant work (checkout, webhooks, campaign close, imports)
-- go through the service-role client only after a server-side guard has run.

-- ---------------------------------------------------------------- helpers
create or replace function public.current_profile_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from profiles where auth_user_id = auth.uid();
$$;

create or replace function public.current_role_name() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where auth_user_id = auth.uid();
$$;

create or replace function public.is_sorkyst_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where auth_user_id = auth.uid() and role = 'SORKYST_ADMIN');
$$;

create or replace function public.has_club_access(target_club uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_sorkyst_admin()
      or exists (
        select 1 from club_admins ca
        where ca.club_id = target_club and ca.profile_id = public.current_profile_id()
      );
$$;

create or replace function public.has_team_access(target_team uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from teams t
    where t.id = target_team and public.has_club_access(t.club_id)
  )
  or exists (
    select 1 from team_admins ta
    where ta.team_id = target_team and ta.profile_id = public.current_profile_id()
  );
$$;

create or replace function public.has_campaign_access(target_campaign uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from campaigns c
    where c.id = target_campaign and public.has_club_access(c.club_id)
  )
  or exists (
    select 1 from campaign_teams ct
    join team_admins ta on ta.team_id = ct.team_id
    where ct.campaign_id = target_campaign and ta.profile_id = public.current_profile_id()
  );
$$;

create or replace function public.owns_seller(target_seller uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from sellers s
    where s.id = target_seller and s.profile_id = public.current_profile_id()
  );
$$;

-- ---------------------------------------------------------------- enable
alter table profiles         enable row level security;
alter table clubs            enable row level security;
alter table teams            enable row level security;
alter table club_admins      enable row level security;
alter table team_admins      enable row level security;
alter table campaigns        enable row level security;
alter table campaign_teams   enable row level security;
alter table sellers          enable row level security;
alter table orders           enable row level security;
alter table seller_pickups   enable row level security;
alter table order_deliveries enable row level security;
alter table payments         enable row level security;
alter table audit_log        enable row level security;

-- ---------------------------------------------------------------- profiles
create policy profiles_select_self on profiles for select
  using (auth_user_id = auth.uid() or public.is_sorkyst_admin());
create policy profiles_update_self on profiles for update
  using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());

-- ---------------------------------------------------------------- clubs
create policy clubs_select on clubs for select
  using (
    public.has_club_access(id)
    or exists (
      select 1 from teams t join team_admins ta on ta.team_id = t.id
      where t.club_id = clubs.id and ta.profile_id = public.current_profile_id()
    )
    or exists (
      select 1 from sellers s join teams t on t.id = s.team_id
      where t.club_id = clubs.id and s.profile_id = public.current_profile_id()
    )
  );

-- ---------------------------------------------------------------- teams
create policy teams_select on teams for select
  using (
    public.has_team_access(id)
    or exists (select 1 from sellers s where s.team_id = teams.id and s.profile_id = public.current_profile_id())
  );

-- ---------------------------------------------------------------- memberships
create policy club_admins_select on club_admins for select
  using (profile_id = public.current_profile_id() or public.has_club_access(club_id));
create policy team_admins_select on team_admins for select
  using (profile_id = public.current_profile_id() or public.has_team_access(team_id));

-- ---------------------------------------------------------------- campaigns
create policy campaigns_select on campaigns for select
  using (
    public.has_campaign_access(id)
    or exists (select 1 from sellers s where s.campaign_id = campaigns.id and s.profile_id = public.current_profile_id())
  );

create policy campaign_teams_select on campaign_teams for select
  using (public.has_campaign_access(campaign_id) or public.has_team_access(team_id));

-- ---------------------------------------------------------------- sellers
create policy sellers_select on sellers for select
  using (
    profile_id = public.current_profile_id()
    or public.has_team_access(team_id)
    or public.has_campaign_access(campaign_id)
  );

-- ---------------------------------------------------------------- orders (customer data)
create policy orders_select on orders for select
  using (
    public.owns_seller(seller_id)
    or public.has_team_access(team_id)
    or public.has_club_access(club_id)
  );

-- ---------------------------------------------------------------- pickups
create policy seller_pickups_select on seller_pickups for select
  using (public.owns_seller(seller_id) or public.has_campaign_access(campaign_id));
create policy seller_pickups_update on seller_pickups for update
  using (public.has_campaign_access(campaign_id))
  with check (public.has_campaign_access(campaign_id));

-- ---------------------------------------------------------------- deliveries
create policy order_deliveries_select on order_deliveries for select
  using (
    public.owns_seller(seller_id)
    or exists (select 1 from orders o where o.id = order_deliveries.order_id and public.has_club_access(o.club_id))
    or exists (select 1 from orders o where o.id = order_deliveries.order_id and public.has_team_access(o.team_id))
  );
create policy order_deliveries_update on order_deliveries for update
  using (public.owns_seller(seller_id))
  with check (public.owns_seller(seller_id));

-- ---------------------------------------------------------------- payments
create policy payments_select on payments for select
  using (
    exists (
      select 1 from orders o
      where o.id = payments.order_id
        and (public.has_club_access(o.club_id) or public.owns_seller(o.seller_id))
    )
  );

-- ---------------------------------------------------------------- audit log
create policy audit_log_select on audit_log for select
  using (public.is_sorkyst_admin());
