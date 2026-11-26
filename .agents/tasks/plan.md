# Implementation Plan — Per-club Management Dashboard

This plan is decomposed into three sequential FEATs, each in its own artifact file under
`.agents/tasks/task-club-manage-dashboard/features/`. Read `context.json` in that directory
before implementing any FEAT.

---

## FEAT-001 · SQL migration

- [ ] 1. Create `supabase/migrations/20261127000000_club_events.sql`.
      **What:** Add `public.club_events` table, enable RLS, write five security-definer RPCs.
      
      **Table `public.club_events`:**
      ```
      id             uuid pk default gen_random_uuid()
      organization_id uuid not null references public.organizations(id) on delete cascade
      title          text not null, check length(trim(title)) between 2 and 120
      description    text not null default '', check length(description) <= 500
      location       text not null default '', check length(location) <= 120
      event_date     timestamptz not null
      is_cancelled   boolean not null default false
      created_by     uuid references auth.users(id) on delete set null
      created_at     timestamptz not null default now()
      ```
      Index: `(organization_id, event_date)`.
      
      **RLS:** Enable on `club_events`. One policy for authenticated: `select` where `not is_cancelled`.
      
      **RPCs (all: `security definer`, `set search_path = ''`, revoke from public, grant to authenticated):**
      
      - `upsert_club_event(p_organization_id uuid, p_event_id uuid, p_title text, p_description text, p_location text, p_event_date timestamptz) returns uuid`
        — guards: active event_manager OR club_admin in that org. Validates lengths. Inserts (p_event_id null) or updates existing row. Returns the event id.
      
      - `cancel_club_event(p_organization_id uuid, p_event_id uuid) returns void`
        — guards: event_manager OR club_admin. Sets `is_cancelled = true`.
      
      - `get_club_events(p_organization_id uuid) returns table(id, title, description, location, event_date, is_cancelled, created_at)`
        — no role check; any authenticated user can read. Returns all events ordered by event_date asc.
      
      - `get_club_manage_data(p_slug text) returns json`
        — looks up org by slug (status='active'), guards: active club_admin/membership_manager/event_manager or platform_admin; raises 42501 "You do not manage this club" otherwise. Returns JSON: `{ club: {id,name,slug,category,description,logo_url}, caller_role, pending_requests: [{user_id,full_name,requested_at,badges}], active_members: [{user_id,full_name,role}], club_badges: [{id,name,description,color}] }`. Use same badges join pattern as `get_organization_join_requests` in the existing migration.
      
      - `remove_club_member(p_organization_id uuid, p_user_id uuid) returns void`
        — guards: active club_admin OR membership_manager. Sets `status = 'left'` where `status = 'active'`.
      
      **Files:** `supabase/migrations/20261127000000_club_events.sql`
      **Verify:** `npm run build` — exits 0.

---

## FEAT-002 · Manage dashboard page

- [ ] 2. Create `app/(main)/clubs/[slug]/manage/page.tsx`.
      Depends on FEAT-001 RPCs.
      
      **Skeleton & error states:**
      - On mount call `supabase.rpc('get_club_manage_data', { p_slug: params.slug })`.
      - Loading: full-page animate-pulse skeleton (3 rectangles).
      - 42501 error: error card "You do not have permission to manage this club." + back button → /clubs.
      - P0002 / no data: "Club not found." + back button.
      
      **TypeScript types (strict, no `any`):**
      `ClubRole = 'club_admin' | 'membership_manager' | 'event_manager'`
      `ManageData`, `ClubInfo`, `JoinRequest` (import `UserBadge` from `@/components/UserName`), `ActiveMember`, `ClubBadge`, `ClubEvent` — all defined inline in the file.
      
      **Page header (sticky):**
      Back button (ArrowLeft → /clubs) | logo + club name + category | caller_role chip.
      
      **Tabs:** Derive from `caller_role`:
      - Overview (club_admin only)
      - Members (club_admin or membership_manager)
      - Events (club_admin or event_manager)
      - Badges (club_admin only)
      Active tab: `bg-[#0047B3] text-white rounded-xl px-4 py-2 text-sm font-semibold`. Inactive: `border border-gray-200 text-[#001533]`.
      
      **Overview tab:**
      Editable form pre-filled with `manage_data.club` fields (name, category, description, logo). Submit calls `update_organization_details` RPC. Logo upload: copy `uploadClubLogo` from `clubs/page.tsx` (Cloudinary, PNG/JPEG/WebP, ≤5 MB). Stats strip: member count, pending requests count, badges count — three `rounded-2xl bg-white shadow-sm` cards.
      
      **Members tab:**
      - Section 1 "Pending requests": render each with `<UserName>` component, `requested_at` timestamp, Approve (green Check) / Decline (red X) buttons. Calls `review_organization_join_request` RPC then refreshes.
      - Section 2 "Active members": full_name + role chip + Remove button (club_admin only). Remove calls `remove_club_member` RPC then refreshes.
      
      **Events tab:**
      - On tab activation call `get_club_events`. Find nearest future non-cancelled event.
      - Countdown card: live countdown (days/hours/minutes/seconds) via `setInterval` in `useEffect`, cleared on unmount.
      - Create/edit form: title, description, location, `datetime-local` input for event_date. Submit calls `upsert_club_event` (p_event_id null = create, set = edit). Refresh after.
      - Events list: title, location, formatted date, description preview. Edit button populates form. Cancel calls `cancel_club_event`. Cancelled shown with `line-through opacity-50`.
      
      **Badges tab:**
      Render `<ClubBadgeManager organizationId={...} badges={...} onBadgesChanged={refreshManageData} />` (import from `@/components/ClubBadgeManager`).
      
      **Error/notice banners:** Same pattern as `clubs/page.tsx` — `role="alert"` red-50 / `role="status"` green-50.
      Busy state: string busyKey (e.g. `${userId}:approve`), disable buttons, show "Saving..." text.
      
      **Files:** `app/(main)/clubs/[slug]/manage/page.tsx`
      **Verify:** `npm run build` — exits 0, no TypeScript errors.

---

## FEAT-003 · Prune clubs/page.tsx

- [ ] 3. Update `app/(main)/clubs/page.tsx`.
      Depends on FEAT-002 route existing. FEAT-001's `get_club_events` RPC powers the countdown.
      
      **Remove from Club type:** `join_requests`, `badges` fields.
      **Add to Club type:** `next_event_date: string | null`.
      
      **Remove from state/functions:**
      - `editingClubId`, `editName`, `editCategory`, `editDescription`, `editLogoFile` state vars.
      - `startEditingClub`, `saveClubDetails`, `handleClubBadgesChanged` functions.
      - `uploadClubLogo` function and `CloudinaryUploadResponse` type.
      
      **Remove from loadData:**
      - The `managerRequests` parallel fetch (all `get_organization_join_requests` calls).
      - The `badgeResult` fetch (`organization_badges` select).
      - The `requestsByClub` and `badgesByClub` Map constructions.
      - Remove `join_requests` and `badges` from the `setClubs` call.
      
      **Add to loadData:** After building clubs, do `Promise.all` over all clubs calling `get_club_events` for each. For each result find `Math.min` of future `event_date` timestamps. Set `next_event_date` on each Club. Guard with `if (clubs.length > 0)` to skip for empty directory. Only run this fetch when user is logged in (wrap with `if (user)`), otherwise leave `next_event_date: null` for all.
      
      **Add helper (above component):**
      ```ts
      function formatCountdown(eventDate: string): string {
        const ms = new Date(eventDate).getTime() - Date.now();
        if (ms <= 0) return 'Today';
        const days = Math.floor(ms / 86400000);
        if (days >= 1) return `${days}d`;
        const hours = Math.floor(ms / 3600000);
        const mins = Math.floor((ms % 3600000) / 60000);
        return `${hours}h ${mins}m`;
      }
      ```
      
      **Card JSX changes:**
      - Remove: edit form block, inline `is_manager` join-requests + badge-manager section, 'Edit club' button (Pencil icon).
      - Add countdown chip after member count row: `if (club.next_event_date)` render `<div className="mt-2 inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#0047B3]"><Clock3 className="h-3 w-3" />{formatCountdown(club.next_event_date)}</div>`.
      - Add Manage button after the join/member status block: `if (club.is_manager || club.is_club_admin)` render `<Link href={'/clubs/' + club.slug + '/manage'} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0047B3] px-4 py-3 text-sm font-semibold text-white hover:bg-[#003B99]">Manage club <ArrowRight className="h-4 w-4" /></Link>`.
      
      **Import changes:**
      - Remove: `Check`, `Pencil`, `ImagePlus` from lucide-react.
      - Add: `ArrowRight` from lucide-react.
      - Add: `Link` from `next/link`.
      - Remove: `ClubBadgeManager` import.
      - Keep: all other existing imports.
      
      **Files:** `app/(main)/clubs/page.tsx`
      **Verify:** `npm run build` — exits 0, no TypeScript errors.
