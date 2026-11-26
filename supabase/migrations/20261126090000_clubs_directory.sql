create table if not exists public.campuses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

insert into public.campuses (name, slug)
values ('Kabarak University', 'kabarak-university')
on conflict (slug) do nothing;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  campus_id uuid not null references public.campuses(id) on delete restrict,
  name text not null check (length(trim(name)) between 2 and 100),
  slug text not null,
  category text not null check (length(trim(category)) between 2 and 60),
  description text not null check (length(trim(description)) between 10 and 1000),
  logo_url text check (
    logo_url is null
    or logo_url ~ '^https://res\.cloudinary\.com/[A-Za-z0-9_-]+/image/upload/'
  ),
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (campus_id, slug)
);

create table if not exists public.organization_applications (
  id uuid primary key default gen_random_uuid(),
  campus_id uuid not null references public.campuses(id) on delete restrict,
  applicant_id uuid not null references auth.users(id) on delete cascade,
  applicant_name text not null check (length(trim(applicant_name)) between 2 and 120),
  applicant_email text not null,
  authority_confirmed boolean not null default false,
  logo_url text check (
    logo_url is null
    or logo_url ~ '^https://res\.cloudinary\.com/[A-Za-z0-9_-]+/image/upload/'
  ),
  name text not null check (length(trim(name)) between 2 and 100),
  category text not null check (length(trim(category)) between 2 and 60),
  description text not null check (length(trim(description)) between 10 and 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.organization_memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member'
    check (role in ('club_admin', 'membership_manager', 'event_manager', 'member')),
  status text not null default 'pending'
    check (status in ('pending', 'active', 'rejected', 'left')),
  requested_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  role_assigned_by uuid references auth.users(id) on delete set null,
  role_assigned_at timestamptz,
  primary key (organization_id, user_id)
);

create index if not exists organization_applications_status_created_idx
  on public.organization_applications (status, created_at desc);

create index if not exists organization_memberships_user_status_idx
  on public.organization_memberships (user_id, status);

create index if not exists organization_memberships_org_status_idx
  on public.organization_memberships (organization_id, status);

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  );
$$;

create or replace function public.is_organization_manager(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_memberships m
    where m.organization_id = p_organization_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role in ('club_admin', 'membership_manager')
  );
$$;

create or replace function public.get_public_club_member_counts()
returns table (organization_id uuid, member_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select o.id, count(m.user_id)::bigint
  from public.organizations o
  left join public.organization_memberships m
    on m.organization_id = o.id
   and m.status = 'active'
  where o.status = 'active'
  group by o.id;
$$;

create or replace function public.get_organization_join_requests(p_organization_id uuid)
returns table (user_id uuid, full_name text, requested_at timestamptz)
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
    select m.user_id, coalesce(p.full_name, 'Kabarak student'), m.requested_at
    from public.organization_memberships m
    left join public.profiles p on p.id = m.user_id
    where m.organization_id = p_organization_id
      and m.status = 'pending'
    order by m.requested_at;
end;
$$;

create or replace function public.request_to_join_organization(p_organization_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'Sign in before requesting to join'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.organizations o
    where o.id = p_organization_id
      and o.status = 'active'
  ) then
    raise exception 'This organization is not accepting join requests'
      using errcode = 'P0002';
  end if;

  insert into public.organization_memberships as existing_membership
    (organization_id, user_id, role, status)
  values (p_organization_id, v_user_id, 'member', 'pending')
  on conflict (organization_id, user_id) do update
    set role = 'member',
        status = 'pending',
        requested_at = now(),
        reviewed_by = null,
        reviewed_at = null
    where existing_membership.status in ('rejected', 'left');

  if not found then
    raise exception 'You already have an active membership or a pending request'
      using errcode = '23505';
  end if;
end;
$$;

create or replace function public.review_club_application(
  p_application_id uuid,
  p_approved boolean,
  p_review_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_application public.organization_applications%rowtype;
  v_organization_id uuid;
  v_slug text;
begin
  if not public.is_platform_admin() then
    raise exception 'Only a platform administrator can review club applications'
      using errcode = '42501';
  end if;

  select *
    into v_application
    from public.organization_applications
    where id = p_application_id
    for update;

  if not found or v_application.status <> 'pending' then
    raise exception 'This club application is no longer pending'
      using errcode = 'P0002';
  end if;

  if p_approved then
    v_slug := trim(both '-' from lower(regexp_replace(v_application.name, '[^a-zA-Z0-9]+', '-', 'g')));
    if v_slug = '' then
      v_slug := 'club';
    end if;
    v_slug := v_slug || '-' || left(v_application.id::text, 8);

    insert into public.organizations (
      campus_id, name, slug, category, description, logo_url, created_by
    )
    values (
      v_application.campus_id,
      v_application.name,
      v_slug,
      v_application.category,
      v_application.description,
      v_application.logo_url,
      v_application.applicant_id
    )
    returning id into v_organization_id;

    insert into public.organization_memberships (
      organization_id,
      user_id,
      role,
      status,
      reviewed_by,
      reviewed_at,
      role_assigned_by,
      role_assigned_at
    )
    values (
      v_organization_id,
      v_application.applicant_id,
      'club_admin',
      'active',
      (select auth.uid()),
      now(),
      (select auth.uid()),
      now()
    );
  end if;

  update public.organization_applications
    set status = case when p_approved then 'approved' else 'rejected' end,
        review_note = nullif(trim(coalesce(p_review_note, '')), ''),
        reviewed_by = (select auth.uid()),
        reviewed_at = now()
    where id = p_application_id;

  return v_organization_id;
end;
$$;

create or replace function public.review_organization_join_request(
  p_organization_id uuid,
  p_user_id uuid,
  p_approved boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (
    public.is_platform_admin()
    or public.is_organization_manager(p_organization_id)
  ) then
    raise exception 'You are not allowed to review this join request'
      using errcode = '42501';
  end if;

  update public.organization_memberships
    set status = case when p_approved then 'active' else 'rejected' end,
        role = 'member',
        reviewed_by = (select auth.uid()),
        reviewed_at = now()
    where organization_id = p_organization_id
      and user_id = p_user_id
      and status = 'pending';

  if not found then
    raise exception 'This join request is no longer pending'
      using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.search_campus_users(
  p_search text,
  p_organization_id uuid
)
returns table (
  user_id uuid,
  full_name text,
  email text,
  membership_role text,
  membership_status text
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

  if not exists (
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
      m.status
    from auth.users u
    left join public.profiles p on p.id = u.id
    left join public.organization_memberships m
      on m.user_id = u.id
     and m.organization_id = p_organization_id
    where lower(coalesce(p.full_name, u.raw_user_meta_data ->> 'full_name', '')) like v_search || '%'
       or lower(coalesce(u.email, '')) like v_search || '%'
    order by coalesce(nullif(trim(p.full_name), ''), u.email, 'Unnamed account')
    limit 25;
end;
$$;

create or replace function public.assign_organization_role(
  p_organization_id uuid,
  p_user_id uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Only a platform administrator can assign club roles'
      using errcode = '42501';
  end if;

  if p_role is null or p_role not in (
    'club_admin',
    'membership_manager',
    'event_manager',
    'member'
  ) then
    raise exception 'Choose a valid club role'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.organizations o
    where o.id = p_organization_id
      and o.status = 'active'
  ) then
    raise exception 'This club is not active'
      using errcode = 'P0002';
  end if;

  if not exists (select 1 from auth.users u where u.id = p_user_id) then
    raise exception 'The selected account does not exist'
      using errcode = 'P0002';
  end if;

  insert into public.organization_memberships (
    organization_id,
    user_id,
    role,
    status,
    reviewed_by,
    reviewed_at,
    role_assigned_by,
    role_assigned_at
  )
  values (
    p_organization_id,
    p_user_id,
    p_role,
    'active',
    (select auth.uid()),
    now(),
    (select auth.uid()),
    now()
  )
  on conflict (organization_id, user_id) do update
    set role = excluded.role,
        status = 'active',
        reviewed_by = excluded.reviewed_by,
        reviewed_at = excluded.reviewed_at,
        role_assigned_by = excluded.role_assigned_by,
        role_assigned_at = excluded.role_assigned_at;
end;
$$;

alter table public.campuses enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_applications enable row level security;
alter table public.organization_memberships enable row level security;

create policy "Campuses are readable"
  on public.campuses for select to anon, authenticated
  using (true);

create policy "Active organizations are public"
  on public.organizations for select to anon, authenticated
  using (status = 'active' or public.is_platform_admin());

create policy "Applicants and admins can read applications"
  on public.organization_applications for select to authenticated
  using (applicant_id = (select auth.uid()) or public.is_platform_admin());

create policy "Users can submit club applications"
  on public.organization_applications for insert to authenticated
  with check (
    applicant_id = (select auth.uid())
    and status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
    and review_note is null
    and authority_confirmed
    and applicant_email = (select auth.jwt() ->> 'email')
  );

create policy "Users and admins can read memberships"
  on public.organization_memberships for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_platform_admin()
  );

grant select on public.campuses, public.organizations to anon, authenticated;
grant select, insert on public.organization_applications to authenticated;
grant select on public.organization_memberships to authenticated;

revoke all on function public.is_platform_admin() from public;
revoke all on function public.is_organization_manager(uuid) from public;
revoke all on function public.get_public_club_member_counts() from public;
revoke all on function public.get_organization_join_requests(uuid) from public;
revoke all on function public.request_to_join_organization(uuid) from public;
revoke all on function public.review_club_application(uuid, boolean, text) from public;
revoke all on function public.review_organization_join_request(uuid, uuid, boolean) from public;
revoke all on function public.search_campus_users(text, uuid) from public;
revoke all on function public.assign_organization_role(uuid, uuid, text) from public;

grant execute on function public.is_platform_admin() to anon, authenticated;
grant execute on function public.is_organization_manager(uuid) to authenticated;
grant execute on function public.get_public_club_member_counts() to anon, authenticated;
grant execute on function public.get_organization_join_requests(uuid) to authenticated;
grant execute on function public.request_to_join_organization(uuid) to authenticated;
grant execute on function public.review_club_application(uuid, boolean, text) to authenticated;
grant execute on function public.review_organization_join_request(uuid, uuid, boolean) to authenticated;
grant execute on function public.search_campus_users(text, uuid) to authenticated;
grant execute on function public.assign_organization_role(uuid, uuid, text) to authenticated;
