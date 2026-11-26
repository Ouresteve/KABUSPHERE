-- Migration: club_announcements — member portal announcements, badges, and member data

-- ============================================================
-- TABLE: club_announcements
-- ============================================================
create table if not exists public.club_announcements (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title           text not null check (length(title) between 2 and 120),
  body            text not null check (length(body) between 2 and 2000),
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  is_pinned       boolean not null default false
);

-- ============================================================
-- RLS
-- ============================================================
alter table public.club_announcements enable row level security;

drop policy if exists 'Active members can read announcements' on public.club_announcements;
create policy 'Active members can read announcements'
  on public.club_announcements for select to authenticated
  using (
    public.is_platform_admin()
    or exists (
      select 1
      from public.organization_memberships m
      where m.organization_id = club_announcements.organization_id
        and m.user_id         = (select auth.uid())
        and m.status          = 'active'
    )
  );

-- ============================================================
-- RPC: post_club_announcement
-- ============================================================
drop function if exists public.post_club_announcement(uuid, text, text, boolean);
create function public.post_club_announcement(
  p_organization_id uuid,
  p_title           text,
  p_body            text,
  p_is_pinned       boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not exists (
    select 1
    from public.organization_memberships m
    where m.organization_id = p_organization_id
      and m.user_id         = (select auth.uid())
      and m.status          = 'active'
      and m.role            in ('club_admin', 'event_manager')
  ) then
    raise exception 'You must be a club administrator or event manager to post announcements'
      using errcode = '42501';
  end if;

  if length(trim(coalesce(p_title, ''))) not between 2 and 120 then
    raise exception 'Announcement title must be between 2 and 120 characters'
      using errcode = '22023';
  end if;

  if length(trim(coalesce(p_body, ''))) not between 2 and 2000 then
    raise exception 'Announcement body must be between 2 and 2000 characters'
      using errcode = '22023';
  end if;

  insert into public.club_announcements (organization_id, title, body, is_pinned, created_by)
  values (
    p_organization_id,
    trim(p_title),
    trim(p_body),
    p_is_pinned,
    (select auth.uid())
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- ============================================================
-- RPC: delete_club_announcement
-- ============================================================
drop function if exists public.delete_club_announcement(uuid, uuid);
create function public.delete_club_announcement(
  p_organization_id  uuid,
  p_announcement_id  uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.organization_memberships m
    where m.organization_id = p_organization_id
      and m.user_id         = (select auth.uid())
      and m.status          = 'active'
      and m.role            in ('club_admin', 'event_manager')
  ) then
    raise exception 'You must be a club administrator or event manager to delete announcements'
      using errcode = '42501';
  end if;

  delete from public.club_announcements
    where id              = p_announcement_id
      and organization_id = p_organization_id;

  if not found then
    raise exception 'Announcement not found'
      using errcode = 'P0002';
  end if;
end;
$$;

-- ============================================================
-- RPC: get_club_announcements
-- ============================================================
drop function if exists public.get_club_announcements(uuid);
create function public.get_club_announcements(p_organization_id uuid)
returns table (
  id          uuid,
  title       text,
  body        text,
  is_pinned   boolean,
  created_at  timestamptz,
  author_name text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin()
     and not exists (
       select 1
       from public.organization_memberships m
       where m.organization_id = p_organization_id
         and m.user_id         = (select auth.uid())
         and m.status          = 'active'
     ) then
    raise exception 'You must be an active member to view announcements'
      using errcode = '42501';
  end if;

  return query
    select
      a.id,
      a.title,
      a.body,
      a.is_pinned,
      a.created_at,
      coalesce(nullif(trim(p.full_name), ''), 'Kabarak student')::text
    from public.club_announcements a
    left join public.profiles p on p.id = a.created_by
    where a.organization_id = p_organization_id
    order by a.is_pinned desc, a.created_at desc
    limit 20;
end;
$$;

-- ============================================================
-- RPC: get_member_club_badges
-- ============================================================
drop function if exists public.get_member_club_badges(uuid);
create function public.get_member_club_badges(p_organization_id uuid)
returns table (
  badge_id    uuid,
  name        text,
  color       text,
  description text,
  is_visible  boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.organization_memberships m
    where m.organization_id = p_organization_id
      and m.user_id         = (select auth.uid())
      and m.status          = 'active'
  ) then
    raise exception 'You must be an active member to view your badges'
      using errcode = '42501';
  end if;

  return query
    select
      ub.badge_id,
      b.name,
      b.color,
      b.description,
      ub.is_visible
    from public.user_badges ub
    join public.organization_badges b on b.id = ub.badge_id
    where b.organization_id = p_organization_id
      and b.kind            = 'club'
      and b.is_active
      and ub.user_id        = (select auth.uid())
    order by b.name;
end;
$$;

-- ============================================================
-- RPC: get_club_member_data
-- ============================================================
drop function if exists public.get_club_member_data(text);
create function public.get_club_member_data(p_slug text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org_id    uuid;
  v_join_date timestamptz;
begin
  select o.id into v_org_id
    from public.organizations o
    where o.slug   = p_slug
      and o.status = 'active';

  if not found then
    raise exception 'Club not found'
      using errcode = 'P0002';
  end if;

  if not exists (
    select 1
    from public.organization_memberships m
    where m.organization_id = v_org_id
      and m.user_id         = (select auth.uid())
      and m.status          = 'active'
  ) then
    raise exception 'You must be an active member of this club to access member data'
      using errcode = '42501';
  end if;

  select m.joined_at into v_join_date
    from public.organization_memberships m
    where m.organization_id = v_org_id
      and m.user_id         = (select auth.uid());

  return json_build_object(
    'announcements', (
      select coalesce(
        json_agg(
          json_build_object(
            'id',          a.id,
            'title',       a.title,
            'body',        a.body,
            'is_pinned',   a.is_pinned,
            'created_at',  a.created_at,
            'author_name', coalesce(nullif(trim(p.full_name), ''), 'Kabarak student')
          )
          order by a.is_pinned desc, a.created_at desc
        ),
        '[]'::json
      )
      from (
        select
          a2.id,
          a2.title,
          a2.body,
          a2.is_pinned,
          a2.created_at,
          a2.created_by
        from public.club_announcements a2
        where a2.organization_id = v_org_id
        order by a2.is_pinned desc, a2.created_at desc
        limit 20
      ) a
      left join public.profiles p on p.id = a.created_by
    ),
    'caller_club_badges', (
      select coalesce(
        json_agg(
          json_build_object(
            'badge_id',    ub.badge_id,
            'name',        b.name,
            'color',       b.color,
            'description', b.description,
            'is_visible',  ub.is_visible
          )
          order by b.name
        ),
        '[]'::json
      )
      from public.user_badges ub
      join public.organization_badges b on b.id = ub.badge_id
      where b.organization_id = v_org_id
        and b.kind            = 'club'
        and b.is_active
        and ub.user_id        = (select auth.uid())
    ),
    'caller_join_date', v_join_date
  );
end;
$$;

-- ============================================================
-- GRANTS
-- ============================================================
revoke all on function public.post_club_announcement(uuid, text, text, boolean) from public;
grant execute on function public.post_club_announcement(uuid, text, text, boolean) to authenticated;

revoke all on function public.delete_club_announcement(uuid, uuid) from public;
grant execute on function public.delete_club_announcement(uuid, uuid) to authenticated;

revoke all on function public.get_club_announcements(uuid) from public;
grant execute on function public.get_club_announcements(uuid) to authenticated;

revoke all on function public.get_member_club_badges(uuid) from public;
grant execute on function public.get_member_club_badges(uuid) to authenticated;

revoke all on function public.get_club_member_data(text) from public;
grant execute on function public.get_club_member_data(text) to authenticated;
