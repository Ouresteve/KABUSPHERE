# Implementation Plan — Club Member Portal & Announcements

## File change list

| File | Change |
|---|---|
| `supabase/migrations/20261127020000_club_announcements.sql` | **CREATE** — new migration with table, RLS, and 5 RPCs |
| `app/(main)/clubs/[slug]/page.tsx` | **MODIFY** — add types, state, fetchMemberData, relativeTime, member-only JSX sections |
| `app/(main)/clubs/[slug]/manage/page.tsx` | **MODIFY** — add type, state, loadAnnouncements, handlers, Announcements tab in visibleTabs, Announcements tab JSX |

---

## SQL migration outline — 20261127020000_club_announcements.sql

**Table:**
```sql
create table public.club_announcements (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title           text not null check (length(title) between 2 and 120),
  body            text not null check (length(body) between 2 and 2000),
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  is_pinned       boolean not null default false
);
```

**RLS:** Enable RLS on `club_announcements`. SELECT policy for `authenticated`: allow if `is_platform_admin()` OR caller has an active membership row for that `organization_id`. No INSERT/UPDATE/DELETE from client (all mutations go through RPCs).

**RPCs (all `security definer`, `set search_path = ''`):**

1. `post_club_announcement(p_organization_id uuid, p_title text, p_body text, p_is_pinned boolean) returns uuid`
   - Caller must be active `club_admin` or `event_manager` in that org (raise `42501`).
   - Validate title length 2–120, body length 2–2000 (raise `22023`).
   - Insert and return new `id`.

2. `delete_club_announcement(p_organization_id uuid, p_announcement_id uuid) returns void`
   - Caller must be active `club_admin` or `event_manager` (raise `42501`).
   - Delete matching row; raise `P0002` if not found.

3. `get_club_announcements(p_organization_id uuid) returns table(id, title, body, is_pinned, created_at, author_name)`
   - Caller must be active member (any role) or platform admin (raise `42501`).
   - Returns rows ordered `is_pinned desc, created_at desc`, limit 20.
   - `author_name`: `coalesce(nullif(trim(profiles.full_name),''), 'Kabarak student')`.

4. `get_member_club_badges(p_organization_id uuid) returns table(badge_id, name, color, description, is_visible)`
   - Caller must be active member (raise `42501`).
   - Joins `user_badges` → `organization_badges` where `kind='club'`, `organization_id=p_organization_id`, `is_active=true`, `user_id=auth.uid()`.

5. `get_club_member_data(p_slug text) returns json`
   - Look up org by slug where `status='active'` (raise `P0002` if missing).
   - If caller is not an active member, raise `42501` (errcode `'42501'`).
   - Returns `json_build_object('announcements', [...], 'caller_club_badges', [...], 'caller_join_date', joined_at)`.
   - Announcements: same query as `get_club_announcements`, limit 20, as a JSON array.
   - Caller club badges: same query as `get_member_club_badges`, as a JSON array.

**Grants:** `revoke all … from public; grant execute … to authenticated;` for all five RPCs.

---

## TypeScript type additions

### app/(main)/clubs/[slug]/page.tsx — add after `CallerMembership` type
```ts
type ClubBadgeItem = { badge_id: string; name: string; color: string; description: string; is_visible: boolean };
type Announcement  = { id: string; title: string; body: string; is_pinned: boolean; created_at: string; author_name: string };
type ClubMemberData = { announcements: Announcement[]; caller_club_badges: ClubBadgeItem[]; caller_join_date: string };
```

### app/(main)/clubs/[slug]/manage/page.tsx — add after `ClubEvent` type
```ts
type Announcement = { id: string; title: string; body: string; is_pinned: boolean; created_at: string; author_name: string };
```

---

## State additions per file

### page.tsx (public portal)
```ts
const [memberData, setMemberData]               = useState<ClubMemberData | null>(null);
const [memberDataLoading, setMemberDataLoading] = useState(false);
```

### manage/page.tsx (manage dashboard)
```ts
const [announcements, setAnnouncements]             = useState<Announcement[]>([]);
const [announcementsLoading, setAnnouncementsLoading] = useState(false);
const [annTitle, setAnnTitle]                       = useState('');
const [annBody, setAnnBody]                         = useState('');
const [annPinned, setAnnPinned]                     = useState(false);
```

---

## RPC call patterns

### page.tsx — fetchMemberData
```ts
const { data: md, error: mdErr } = await supabase.rpc('get_club_member_data', { p_slug: params.slug });
if (!mdErr && md) setMemberData(md as ClubMemberData);
```
Triggered by `useEffect` that runs when `user` is defined and `data?.caller_membership?.status === 'active'`.

### manage/page.tsx — loadAnnouncements
```ts
const { data, error: annErr } = await supabase.rpc('get_club_announcements', { p_organization_id: organizationId });
setAnnouncements((data as Announcement[]) ?? []);
```
Triggered in the existing activeTab useEffect when `activeTab === 'Announcements'`.

### manage/page.tsx — handlePostAnnouncement
```ts
await supabase.rpc('post_club_announcement', {
  p_organization_id: manageData.club.id,
  p_title: annTitle.trim(),
  p_body:  annBody.trim(),
  p_is_pinned: annPinned,
});
```

### manage/page.tsx — handleDeleteAnnouncement
```ts
await supabase.rpc('delete_club_announcement', {
  p_organization_id:   manageData.club.id,
  p_announcement_id:   id,
});
```

---

## Ordered implementation steps

- [ ] 1. Create `supabase/migrations/20261127020000_club_announcements.sql` with the `club_announcements` table, RLS policy, and all five RPCs as described above.
        Files: `supabase/migrations/20261127020000_club_announcements.sql`
        Verify: `npm run build` — exits 0 (SQL file is not compiled; this confirms no regressions).

- [ ] 2. Add `ClubBadgeItem`, `Announcement`, `ClubMemberData` types and the `relativeTime` helper function to `app/(main)/clubs/[slug]/page.tsx`. Add `memberData` and `memberDataLoading` state. Add `fetchMemberData` async function. Add `useEffect` that calls `fetchMemberData` when `user` is set and `data?.caller_membership?.status === 'active'`.
        Files: `app/(main)/clubs/[slug]/page.tsx`
        Verify: `npm run build` — no TypeScript errors.

- [ ] 3. Add the members-only JSX block to `app/(main)/clubs/[slug]/page.tsx` after the closing `</section>` of the Members section: (a) membership card section with role, join date, club badge pills; (b) announcements section with pinned/regular cards using `relativeTime`. Wrap the entire block in `{caller_membership?.status === 'active' && (...)}`.
        Files: `app/(main)/clubs/[slug]/page.tsx`
        Verify: `npm run build` — exits 0.

- [ ] 4. Add `Announcement` type, `announcements`/`announcementsLoading`/`annTitle`/`annBody`/`annPinned` state, `loadAnnouncements` function, and extend the activeTab `useEffect` with an Announcements branch to `app/(main)/clubs/[slug]/manage/page.tsx`.
        Files: `app/(main)/clubs/[slug]/manage/page.tsx`
        Verify: `npm run build` — no TypeScript errors.

- [ ] 5. Add `handlePostAnnouncement` and `handleDeleteAnnouncement` handlers and add `'Announcements'` to `visibleTabs` (after Events, before Badges) in `app/(main)/clubs/[slug]/manage/page.tsx`.
        Files: `app/(main)/clubs/[slug]/manage/page.tsx`
        Verify: `npm run build` — exits 0.

- [ ] 6. Add the Announcements tab JSX section to `app/(main)/clubs/[slug]/manage/page.tsx` after the Badges tab section: post form (title input, body textarea, pin checkbox, submit button) + announcements list with pinned/regular card styles and Delete buttons.
        Files: `app/(main)/clubs/[slug]/manage/page.tsx`
        Verify: `npm run build` — exits 0 with no TypeScript errors.

- [ ] 7. Run final build, then commit and push.
        Commands:
        ```
        cd "f:\Desktop\KABU CONNECT\kabu-sphere"
        npm run build
        git add -A
        git commit -m "feat: club member portal sections and announcements"
        git push
        ```
        Verify: `npm run build` exits 0; `git push` succeeds.

---

## Key design decisions

**Single `get_club_member_data` RPC for the portal page** — Rather than two separate client calls (`get_club_announcements` + `get_member_club_badges`), one RPC returns all member data in a single round-trip. The 403 guard is in one place. The individual RPCs still exist for the manage dashboard where they're called separately.

**`fetchMemberData` is not wrapped in `useCallback`** — The existing manage page pattern (`fetchManageData`) shows plain async functions in component bodies with an eslint-disable comment. Following that pattern keeps consistency and avoids a stale-closure dependency chain with `params.slug`.

**`relativeTime` as a plain module-level function** — Not a hook, no deps, pure. Same placement pattern as `buildCountdown` in the same file.

**Announcements tab extends existing `useEffect` watching `[activeTab, manageData?.club.id]`** — Adding a branch inside the existing effect is exactly how `loadEvents` works. No new effect needed.
