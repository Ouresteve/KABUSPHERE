create table if not exists public.campus_schools (
  id uuid primary key default gen_random_uuid(),
  campus_id uuid not null references public.campuses(id) on delete cascade,
  name text not null check (length(trim(name)) between 2 and 100),
  slug text not null,
  created_at timestamptz not null default now(),
  unique (campus_id, slug)
);

alter table public.profiles
  add column if not exists verified_school_id uuid
  references public.campus_schools(id) on delete set null;

alter table public.profiles
  add column if not exists verified_school_by uuid
  references auth.users(id) on delete set null;

alter table public.profiles
  add column if not exists verified_school_at timestamptz;

create table if not exists public.organization_badges (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('school', 'club')),
  campus_id uuid not null references public.campuses(id) on delete cascade,
  school_id uuid references public.campus_schools(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  name text not null check (length(trim(name)) between 2 and 40),
  description text not null default '' check (length(trim(description)) <= 200),
  color text not null default 'blue'
    check (color in ('blue', 'green', 'purple', 'amber', 'rose')),
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (
    (kind = 'school' and school_id is not null and organization_id is null)
    or (kind = 'club' and school_id is null and organization_id is not null)
  )
);

create unique index if not exists organization_badges_school_name_idx
  on public.organization_badges (school_id, lower(name))
  where kind = 'school';

create unique index if not exists organization_badges_club_name_idx
  on public.organization_badges (organization_id, lower(name))
  where kind = 'club';

create table if not exists public.user_badges (
  user_id uuid not null
    constraint user_badges_user_id_fkey references public.profiles(id) on delete cascade,
  badge_id uuid not null
    constraint user_badges_badge_id_fkey references public.organization_badges(id) on delete cascade,
  awarded_by uuid references auth.users(id) on delete set null,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

drop function if exists public.get_organization_join_requests(uuid);
create function public.get_organization_join_requests(p_organization_id uuid)
returns table (
  user_id uuid,
  full_name text,
  requested_at timestamptz,
  badges jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (
    public.is_platform_admin()
    or public.is_organization_manager(p_organization_id)
  ) then
    raise exception 'You are not allowed to review this organization'
      using errcode = '42501';
  end if;

  return query
    select
      m.user_id,
      coalesce(p.full_name, 'Kabarak student')::text,
      m.requested_at,
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'is_visible', true,
              'badge', jsonb_build_object('name', b.name, 'color', b.color, 'kind', b.kind)
            )
            order by b.name
          )
          from public.user_badges ub
          join public.organization_badges b on b.id = ub.badge_id
          where ub.user_id = m.user_id
            and ub.is_visible
            and b.is_active
        ),
        '[]'::jsonb
      )
    from public.organization_memberships m
    left join public.profiles p on p.id = m.user_id
    where m.organization_id = p_organization_id
      and m.status = 'pending'
    order by m.requested_at;
end;
$$;

create index if not exists user_badges_visible_badge_idx
  on public.user_badges (badge_id, user_id)
  where is_visible;

create or replace function public.guard_verified_school_id()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin()
     and (
       (tg_op = 'INSERT' and new.verified_school_id is not null)
       or (tg_op = 'INSERT' and (new.verified_school_by is not null or new.verified_school_at is not null))
       or (
         tg_op = 'UPDATE'
         and (
           new.verified_school_id is distinct from old.verified_school_id
           or new.verified_school_by is distinct from old.verified_school_by
           or new.verified_school_at is distinct from old.verified_school_at
         )
       )
     ) then
    raise exception 'Only a platform administrator can verify school affiliation'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_verified_school_id on public.profiles;
create trigger profiles_guard_verified_school_id
  before insert or update of verified_school_id on public.profiles
  for each row execute function public.guard_verified_school_id();

drop function if exists public.search_campus_users(text, uuid);
create function public.search_campus_users(
  p_search text,
  p_organization_id uuid default null
)
returns table (
  user_id uuid,
  full_name text,
  email text,
  membership_role text,
  membership_status text,
  verified_school_id uuid,
  verified_school_name text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_search text := lower(trim(coalesce(p_search, '')));
begin
  if not public.is_platform_admin() then
    raise exception 'Only a platform administrator can search campus users'
      using errcode = '42501';
  end if;

  if length(v_search) < 2 then
    raise exception 'Enter at least two characters to search'
      using errcode = '22023';
  end if;

  if p_organization_id is not null and not exists (
    select 1
    from public.organizations o
    where o.id = p_organization_id
      and o.status = 'active'
  ) then
    raise exception 'Select an active club before searching'
      using errcode = '22023';
  end if;

  return query
    select
      u.id,
      coalesce(nullif(trim(p.full_name), ''), nullif(u.raw_user_meta_data ->> 'full_name', ''), u.email, 'Unnamed account')::text,
      coalesce(u.email, '')::text,
      m.role,
      m.status,
      p.verified_school_id,
      s.name
    from auth.users u
    left join public.profiles p on p.id = u.id
    left join public.campus_schools s on s.id = p.verified_school_id
    left join public.organization_memberships m
      on m.user_id = u.id
     and m.organization_id = p_organization_id
    where lower(coalesce(p.full_name, u.raw_user_meta_data ->> 'full_name', '')) like v_search || '%'
       or lower(coalesce(u.email, '')) like v_search || '%'
    order by coalesce(nullif(trim(p.full_name), ''), u.email, 'Unnamed account')
    limit 25;
end;
$$;

create or replace function public.update_organization_details(
  p_organization_id uuid,
  p_name text,
  p_category text,
  p_description text,
  p_logo_url text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin() and not exists (
    select 1
    from public.organization_memberships m
    where m.organization_id = p_organization_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role = 'club_admin'
  ) then
    raise exception 'Only this club administrator or a platform administrator can edit club details'
      using errcode = '42501';
  end if;

  if length(trim(coalesce(p_name, ''))) not between 2 and 100
     or length(trim(coalesce(p_category, ''))) not between 2 and 60
     or length(trim(coalesce(p_description, ''))) not between 10 and 1000 then
    raise exception 'Check the club name, category, and description lengths'
      using errcode = '22023';
  end if;

  if p_logo_url is not null
     and p_logo_url !~ '^https://res\.cloudinary\.com/[A-Za-z0-9_-]+/image/upload/' then
    raise exception 'The club logo URL is invalid'
      using errcode = '22023';
  end if;

  update public.organizations
    set name = trim(p_name),
        category = trim(p_category),
        description = trim(p_description),
        logo_url = p_logo_url
    where id = p_organization_id
      and status = 'active';

  if not found then
    raise exception 'This club is unavailable for editing'
      using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.set_organization_status(
  p_organization_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Only a platform administrator can change club availability'
      using errcode = '42501';
  end if;

  if p_status not in ('active', 'suspended') then
    raise exception 'Choose a valid club status'
      using errcode = '22023';
  end if;

  update public.organizations
    set status = p_status
    where id = p_organization_id;

  if not found then
    raise exception 'Club not found'
      using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.create_school_badge(
  p_campus_id uuid,
  p_school_name text,
  p_name text,
  p_description text,
  p_color text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_school_id uuid;
  v_slug text;
  v_badge_id uuid;
begin
  if not public.is_platform_admin() then
    raise exception 'Only a platform administrator can create school badges'
      using errcode = '42501';
  end if;

  if length(trim(coalesce(p_school_name, ''))) not between 2 and 100
     or length(trim(coalesce(p_name, ''))) not between 2 and 40
     or length(trim(coalesce(p_description, ''))) > 200
     or p_color not in ('blue', 'green', 'purple', 'amber', 'rose') then
    raise exception 'Check the school badge details'
      using errcode = '22023';
  end if;

  if not exists (select 1 from public.campuses c where c.id = p_campus_id) then
    raise exception 'Campus not found'
      using errcode = 'P0002';
  end if;

  v_slug := trim(both '-' from lower(regexp_replace(trim(p_school_name), '[^a-zA-Z0-9]+', '-', 'g')));
  insert into public.campus_schools (campus_id, name, slug)
  values (p_campus_id, trim(p_school_name), coalesce(nullif(v_slug, ''), 'school'))
  on conflict (campus_id, slug) do nothing;

  select s.id into v_school_id
    from public.campus_schools s
    where s.campus_id = p_campus_id
      and s.slug = coalesce(nullif(v_slug, ''), 'school');

  insert into public.organization_badges (
    kind, campus_id, school_id, name, description, color, created_by
  )
  values (
    'school', p_campus_id, v_school_id, trim(p_name),
    trim(coalesce(p_description, '')), p_color, (select auth.uid())
  )
  returning id into v_badge_id;

  return v_badge_id;
end;
$$;

create or replace function public.set_verified_school(
  p_user_id uuid,
  p_school_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Only a platform administrator can verify school affiliation'
      using errcode = '42501';
  end if;

  if p_school_id is not null and not exists (
    select 1 from public.campus_schools s where s.id = p_school_id
  ) then
    raise exception 'School not found'
      using errcode = 'P0002';
  end if;

  update public.profiles
    set verified_school_id = p_school_id,
        verified_school_by = case when p_school_id is null then null else (select auth.uid()) end,
        verified_school_at = case when p_school_id is null then null else now() end
    where id = p_user_id;

  if not found then
    raise exception 'The selected account does not have a profile'
      using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.toggle_school_badge(
  p_badge_id uuid,
  p_visible boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_school_id uuid;
begin
  if v_user_id is null then
    raise exception 'Sign in to manage your school badge'
      using errcode = '42501';
  end if;

  select b.school_id into v_school_id
    from public.organization_badges b
    where b.id = p_badge_id
      and b.kind = 'school'
      and b.is_active;

  if not found then
    raise exception 'This school badge is unavailable'
      using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = v_user_id and p.verified_school_id = v_school_id
  ) then
    raise exception 'Your school affiliation must be verified before you can display this badge'
      using errcode = '42501';
  end if;

  if p_visible then
    insert into public.user_badges (user_id, badge_id, is_visible)
    values (v_user_id, p_badge_id, true)
    on conflict (user_id, badge_id) do update set is_visible = true;
  else
    delete from public.user_badges
      where user_id = v_user_id
        and badge_id = p_badge_id
        and awarded_by is null;
  end if;
end;
$$;

create or replace function public.create_club_badge(
  p_organization_id uuid,
  p_name text,
  p_description text,
  p_color text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_campus_id uuid;
  v_badge_id uuid;
begin
  if not public.is_platform_admin() and not exists (
    select 1 from public.organization_memberships m
    where m.organization_id = p_organization_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role = 'club_admin'
  ) then
    raise exception 'Only the club administrator can create club badges'
      using errcode = '42501';
  end if;

  if length(trim(coalesce(p_name, ''))) not between 2 and 40
     or length(trim(coalesce(p_description, ''))) > 200
     or p_color not in ('blue', 'green', 'purple', 'amber', 'rose') then
    raise exception 'Check the badge name, description, and color'
      using errcode = '22023';
  end if;

  select o.campus_id into v_campus_id
    from public.organizations o
    where o.id = p_organization_id and o.status = 'active';

  if not found then
    raise exception 'This club is unavailable'
      using errcode = 'P0002';
  end if;

  insert into public.organization_badges (
    kind, campus_id, organization_id, name, description, color, created_by
  )
  values (
    'club', v_campus_id, p_organization_id, trim(p_name),
    trim(coalesce(p_description, '')), p_color, (select auth.uid())
  )
  returning id into v_badge_id;

  return v_badge_id;
end;
$$;

create or replace function public.search_organization_members(
  p_organization_id uuid,
  p_search text
)
returns table (user_id uuid, full_name text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_search text := lower(trim(coalesce(p_search, '')));
begin
  if not exists (
    select 1 from public.organizations o
    where o.id = p_organization_id and o.status = 'active'
  ) then
    raise exception 'This club is unavailable'
      using errcode = 'P0002';
  end if;

  if not public.is_platform_admin() and not exists (
    select 1 from public.organization_memberships m
    where m.organization_id = p_organization_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role = 'club_admin'
  ) then
    raise exception 'Only the club administrator can search members for badges'
      using errcode = '42501';
  end if;

  if length(v_search) < 2 then
    raise exception 'Enter at least two characters to search members'
      using errcode = '22023';
  end if;

  return query
    select m.user_id, coalesce(nullif(trim(p.full_name), ''), 'Unnamed account')::text
    from public.organization_memberships m
    left join public.profiles p on p.id = m.user_id
    where m.organization_id = p_organization_id
      and m.status = 'active'
      and lower(coalesce(p.full_name, '')) like v_search || '%'
    order by coalesce(nullif(trim(p.full_name), ''), 'Unnamed account')
    limit 25;
end;
$$;

create or replace function public.set_club_member_badge(
  p_badge_id uuid,
  p_user_id uuid,
  p_awarded boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
begin
  select b.organization_id into v_organization_id
    from public.organization_badges b
    where b.id = p_badge_id
      and b.kind = 'club'
      and b.is_active;

  if not found then
    raise exception 'This club badge is unavailable'
      using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from public.organizations o
    where o.id = v_organization_id and o.status = 'active'
  ) then
    raise exception 'This club is unavailable'
      using errcode = 'P0002';
  end if;

  if not public.is_platform_admin() and not exists (
    select 1 from public.organization_memberships m
    where m.organization_id = v_organization_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role = 'club_admin'
  ) then
    raise exception 'Only the club administrator can award club badges'
      using errcode = '42501';
  end if;

  if p_awarded then
    if not exists (
      select 1 from public.organization_memberships m
      where m.organization_id = v_organization_id
        and m.user_id = p_user_id
        and m.status = 'active'
    ) then
      raise exception 'Only active members of this club can receive its badges'
        using errcode = '22023';
    end if;

    insert into public.user_badges (user_id, badge_id, awarded_by, is_visible)
    values (p_user_id, p_badge_id, (select auth.uid()), true)
    on conflict (user_id, badge_id) do update
      set awarded_by = excluded.awarded_by,
          is_visible = true;
  else
    delete from public.user_badges
      where user_id = p_user_id and badge_id = p_badge_id;
  end if;
end;
$$;

alter table public.campus_schools enable row level security;
alter table public.organization_badges enable row level security;
alter table public.user_badges enable row level security;

drop policy if exists "Campus schools are readable" on public.campus_schools;
create policy "Campus schools are readable"
  on public.campus_schools for select to anon, authenticated
  using (true);

drop policy if exists "Active badges are readable" on public.organization_badges;
create policy "Active badges are readable"
  on public.organization_badges for select to anon, authenticated
  using (is_active or public.is_platform_admin());

drop policy if exists "Visible and own badges are readable" on public.user_badges;
create policy "Visible and own badges are readable"
  on public.user_badges for select to anon, authenticated
  using (is_visible or user_id = (select auth.uid()) or public.is_platform_admin());

grant select on public.campus_schools to authenticated;
grant select on public.organization_badges to anon, authenticated;
grant select (user_id, badge_id, is_visible, created_at) on public.user_badges to anon, authenticated;

revoke all on function public.guard_verified_school_id() from public;
revoke all on function public.search_campus_users(text, uuid) from public;
revoke all on function public.get_organization_join_requests(uuid) from public;
revoke all on function public.update_organization_details(uuid, text, text, text, text) from public;
revoke all on function public.set_organization_status(uuid, text) from public;
revoke all on function public.create_school_badge(uuid, text, text, text, text) from public;
revoke all on function public.set_verified_school(uuid, uuid) from public;
revoke all on function public.toggle_school_badge(uuid, boolean) from public;
revoke all on function public.create_club_badge(uuid, text, text, text) from public;
revoke all on function public.search_organization_members(uuid, text) from public;
revoke all on function public.set_club_member_badge(uuid, uuid, boolean) from public;

grant execute on function public.search_campus_users(text, uuid) to authenticated;
grant execute on function public.get_organization_join_requests(uuid) to authenticated;
grant execute on function public.update_organization_details(uuid, text, text, text, text) to authenticated;
grant execute on function public.set_organization_status(uuid, text) to authenticated;
grant execute on function public.create_school_badge(uuid, text, text, text, text) to authenticated;
grant execute on function public.set_verified_school(uuid, uuid) to authenticated;
grant execute on function public.toggle_school_badge(uuid, boolean) to authenticated;
grant execute on function public.create_club_badge(uuid, text, text, text) to authenticated;
grant execute on function public.search_organization_members(uuid, text) to authenticated;
grant execute on function public.set_club_member_badge(uuid, uuid, boolean) to authenticated;
