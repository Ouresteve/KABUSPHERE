-- Migration: club_events table + club manage dashboard RPCs

-- ============================================================
-- Table: public.club_events
-- ============================================================
create table if not exists public.club_events (
  id              uuid        primary key default gen_random_uuid(),
  organization_id uuid        not null references public.organizations(id) on delete cascade,
  title           text        not null check (length(trim(title)) between 2 and 120),
  description     text        not null default '' check (length(description) <= 500),
  location        text        not null default '' check (length(location) <= 120),
  event_date      timestamptz not null,
  is_cancelled    boolean     not null default false,
  created_by      uuid        references auth.users(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index if not exists club_events_org_date_idx
  on public.club_events (organization_id, event_date);

-- ============================================================
-- RLS: public.club_events
-- ============================================================
alter table public.club_events enable row level security;

drop policy if exists "Non-cancelled events readable" on public.club_events;
create policy "Non-cancelled events readable"
  on public.club_events for select to authenticated
  using (not is_cancelled);

-- ============================================================
-- RPC: upsert_club_event
-- ============================================================
drop function if exists public.upsert_club_event(uuid, uuid, text, text, text, timestamptz);
create function public.upsert_club_event(
  p_organization_id uuid,
  p_event_id        uuid,
  p_title           text,
  p_description     text,
  p_location        text,
  p_event_date      timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new_id uuid;
begin
  -- Role guard: event_manager or club_admin (active)
  if not public.is_platform_admin() and not exists (
    select 1
    from public.organization_memberships m
    where m.organization_id = p_organization_id
      and m.user_id = (select auth.uid())
      and m.status  = 'active'
      and m.role   in ('event_manager', 'club_admin')
  ) then
    raise exception 'You are not allowed to manage events for this club'
      using errcode = '42501';
  end if;

  -- Validate inputs
  if length(trim(coalesce(p_title, ''))) not between 2 and 120 then
    raise exception 'Event title must be between 2 and 120 characters'
      using errcode = '22023';
  end if;
  if length(coalesce(p_description, '')) > 500 then
    raise exception 'Event description must be at most 500 characters'
      using errcode = '22023';
  end if;
  if length(coalesce(p_location, '')) > 120 then
    raise exception 'Event location must be at most 120 characters'
      using errcode = '22023';
  end if;
  if p_event_date is null then
    raise exception 'Event date is required'
      using errcode = '22023';
  end if;

  if p_event_id is null then
    -- Insert new event
    insert into public.club_events (
      organization_id, title, description, location, event_date, created_by
    )
    values (
      p_organization_id,
      trim(p_title),
      coalesce(p_description, ''),
      coalesce(p_location, ''),
      p_event_date,
      (select auth.uid())
    )
    returning id into v_new_id;

    return v_new_id;
  else
    -- Update existing event
    update public.club_events
      set title       = trim(p_title),
          description = coalesce(p_description, ''),
          location    = coalesce(p_location, ''),
          event_date  = p_event_date
    where id              = p_event_id
      and organization_id = p_organization_id
      and is_cancelled    = false;

    if not found then
      raise exception 'Event not found or already cancelled'
        using errcode = 'P0002';
    end if;

    return p_event_id;
  end if;
end;
$$;

-- ============================================================
-- RPC: cancel_club_event
-- ============================================================
drop function if exists public.cancel_club_event(uuid, uuid);
create function public.cancel_club_event(
  p_organization_id uuid,
  p_event_id        uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Role guard: event_manager or club_admin (active)
  if not public.is_platform_admin() and not exists (
    select 1
    from public.organization_memberships m
    where m.organization_id = p_organization_id
      and m.user_id = (select auth.uid())
      and m.status  = 'active'
      and m.role   in ('event_manager', 'club_admin')
  ) then
    raise exception 'You are not allowed to manage events for this club'
      using errcode = '42501';
  end if;

  update public.club_events
    set is_cancelled = true
  where id              = p_event_id
    and organization_id = p_organization_id;

  if not found then
    raise exception 'Event not found'
      using errcode = 'P0002';
  end if;
end;
$$;

-- ============================================================
-- RPC: get_club_events
-- ============================================================
drop function if exists public.get_club_events(uuid);
create function public.get_club_events(p_organization_id uuid)
returns table (
  id           uuid,
  title        text,
  description  text,
  location     text,
  event_date   timestamptz,
  is_cancelled boolean,
  created_at   timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return query
    select
      e.id,
      e.title,
      e.description,
      e.location,
      e.event_date,
      e.is_cancelled,
      e.created_at
    from public.club_events e
    where e.organization_id = p_organization_id
    order by e.event_date asc;
end;
$$;

-- ============================================================
-- RPC: get_club_manage_data
-- ============================================================
drop function if exists public.get_club_manage_data(text);
create function public.get_club_manage_data(p_slug text)
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_org_id     uuid;
  v_caller_role text;
  v_result     json;
begin
  -- Look up org by slug
  select o.id into v_org_id
    from public.organizations o
    where o.slug   = p_slug
      and o.status = 'active';

  if not found then
    raise exception 'Club not found'
      using errcode = 'P0002';
  end if;

  -- Access guard: caller must be a manager role or platform admin
  if not public.is_platform_admin() then
    select m.role into v_caller_role
      from public.organization_memberships m
      where m.organization_id = v_org_id
        and m.user_id         = (select auth.uid())
        and m.status          = 'active'
        and m.role           in ('club_admin', 'membership_manager', 'event_manager')
      limit 1;

    if not found then
      raise exception 'You do not manage this club'
        using errcode = '42501';
    end if;
  else
    -- Platform admin: use their membership role if they have one, else 'club_admin'
    select m.role into v_caller_role
      from public.organization_memberships m
      where m.organization_id = v_org_id
        and m.user_id         = (select auth.uid())
        and m.status          = 'active'
      limit 1;

    if not found then
      v_caller_role := 'club_admin';
    end if;
  end if;

  select json_build_object(
    'club', (
      select json_build_object(
        'id',          o.id,
        'name',        o.name,
        'slug',        o.slug,
        'category',    o.category,
        'description', o.description,
        'logo_url',    o.logo_url
      )
      from public.organizations o
      where o.id = v_org_id
    ),
    'caller_role', v_caller_role,
    'pending_requests', (
      select coalesce(
        json_agg(
          json_build_object(
            'user_id',      m.user_id,
            'full_name',    coalesce(p.full_name, 'Kabarak student'),
            'requested_at', m.requested_at,
            'badges',       coalesce(
              (
                select jsonb_agg(
                  jsonb_build_object(
                    'is_visible', true,
                    'badge', jsonb_build_object(
                      'name',  b.name,
                      'color', b.color,
                      'kind',  b.kind
                    )
                  )
                  order by b.name
                )
                from public.user_badges ub
                join public.organization_badges b on b.id = ub.badge_id
                where ub.user_id  = m.user_id
                  and ub.is_visible
                  and b.is_active
              ),
              '[]'::jsonb
            )
          )
          order by m.requested_at
        ),
        '[]'::json
      )
      from public.organization_memberships m
      left join public.profiles p on p.id = m.user_id
      where m.organization_id = v_org_id
        and m.status          = 'pending'
    ),
    'active_members', (
      select coalesce(
        json_agg(
          json_build_object(
            'user_id',   m.user_id,
            'full_name', coalesce(p.full_name, 'Kabarak student'),
            'role',      m.role
          )
          order by coalesce(p.full_name, 'Kabarak student')
        ),
        '[]'::json
      )
      from public.organization_memberships m
      left join public.profiles p on p.id = m.user_id
      where m.organization_id = v_org_id
        and m.status          = 'active'
    ),
    'club_badges', (
      select coalesce(
        json_agg(
          json_build_object(
            'id',          b.id,
            'name',        b.name,
            'description', b.description,
            'color',       b.color
          )
          order by b.name
        ),
        '[]'::json
      )
      from public.organization_badges b
      where b.organization_id = v_org_id
        and b.kind            = 'club'
        and b.is_active       = true
    )
  ) into v_result;

  return v_result;
end;
$$;

-- ============================================================
-- RPC: remove_club_member
-- ============================================================
drop function if exists public.remove_club_member(uuid, uuid);
create function public.remove_club_member(
  p_organization_id uuid,
  p_user_id         uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Role guard: club_admin or membership_manager (active)
  if not public.is_platform_admin() and not exists (
    select 1
    from public.organization_memberships m
    where m.organization_id = p_organization_id
      and m.user_id = (select auth.uid())
      and m.status  = 'active'
      and m.role   in ('club_admin', 'membership_manager')
  ) then
    raise exception 'You are not allowed to remove members from this club'
      using errcode = '42501';
  end if;

  update public.organization_memberships
    set status = 'left'
  where organization_id = p_organization_id
    and user_id         = p_user_id
    and status          = 'active';

  if not found then
    raise exception 'Active membership not found'
      using errcode = 'P0002';
  end if;
end;
$$;

-- ============================================================
-- Grants and revokes
-- ============================================================
revoke all on function public.upsert_club_event(uuid, uuid, text, text, text, timestamptz) from public;
revoke all on function public.cancel_club_event(uuid, uuid) from public;
revoke all on function public.get_club_events(uuid) from public;
revoke all on function public.get_club_manage_data(text) from public;
revoke all on function public.remove_club_member(uuid, uuid) from public;

grant execute on function public.upsert_club_event(uuid, uuid, text, text, text, timestamptz) to authenticated;
grant execute on function public.cancel_club_event(uuid, uuid) to authenticated;
grant execute on function public.get_club_events(uuid) to authenticated;
grant execute on function public.get_club_manage_data(text) to authenticated;
grant execute on function public.remove_club_member(uuid, uuid) to authenticated;
