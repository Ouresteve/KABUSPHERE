-- Migration: club_portal — public-facing club page RPC

-- ============================================================
-- RPC: get_club_public_data
-- ============================================================
drop function if exists public.get_club_public_data(text);
create function public.get_club_public_data(p_slug text)
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_org_id     uuid;
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

  select json_build_object(
    'club', (
      select json_build_object(
        'id',          o.id,
        'name',        o.name,
        'slug',        o.slug,
        'category',    o.category,
        'description', o.description,
        'logo_url',    o.logo_url,
        'campus_name', coalesce(c.name, 'Kabarak University')
      )
      from public.organizations o
      left join public.campuses c on c.id = o.campus_id
      where o.id = v_org_id
    ),
    'member_count', (
      select count(*)
      from public.organization_memberships m
      where m.organization_id = v_org_id
        and m.status = 'active'
    ),
    'upcoming_events', (
      select coalesce(
        json_agg(
          json_build_object(
            'id',          e.id,
            'title',       e.title,
            'description', e.description,
            'location',    e.location,
            'event_date',  e.event_date
          )
          order by e.event_date asc
        ),
        '[]'::json
      )
      from (
        select e2.id, e2.title, e2.description, e2.location, e2.event_date
        from public.club_events e2
        where e2.organization_id = v_org_id
          and e2.is_cancelled    = false
          and e2.event_date      > now()
        order by e2.event_date asc
        limit 5
      ) e
    ),
    'active_members', (
      select coalesce(
        json_agg(
          json_build_object(
            'user_id',   m.user_id,
            'full_name', coalesce(p.full_name, 'Kabarak student'),
            'role',      m.role,
            'badges',    coalesce(
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
          order by coalesce(p.full_name, 'Kabarak student')
        ),
        '[]'::json
      )
      from public.organization_memberships m
      left join public.profiles p on p.id = m.user_id
      where m.organization_id = v_org_id
        and m.status          = 'active'
    ),
    'caller_membership', (
      select case
        when (select auth.uid()) is null then null
        else (
          select json_build_object(
            'status', m.status,
            'role',   m.role
          )
          from public.organization_memberships m
          where m.organization_id = v_org_id
            and m.user_id         = (select auth.uid())
          limit 1
        )
      end
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_club_public_data(text) from public;
grant execute on function public.get_club_public_data(text) to authenticated;
