'use client';

import { useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';

type ClubBadge = { id: string; name: string; description: string; color: string };
type ClubMember = { user_id: string; full_name: string };

export function ClubBadgeManager({
  organizationId,
  badges,
  onBadgesChanged,
}: {
  organizationId: string;
  badges: ClubBadge[];
  onBadgesChanged: () => Promise<void>;
}) {
  const [selectedBadgeId, setSelectedBadgeId] = useState('');
  const [search, setSearch] = useState('');
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [awardedUserIds, setAwardedUserIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [didSearch, setDidSearch] = useState(false);
  const activeBadgeId = selectedBadgeId || badges[0]?.id || '';

  const searchMembers = async (event?: FormEvent<HTMLFormElement>): Promise<boolean> => {
    event?.preventDefault();
    setNotice('');
    if (!activeBadgeId) {
      setError('Create or select a badge first.');
      return false;
    }
    if (search.trim().length < 2) {
      setError('Enter at least two characters to find a club member.');
      return false;
    }

    setBusy(true);
    setError('');
    setDidSearch(false);
    const [membersResult, awardsResult] = await Promise.all([
      supabase.rpc('search_organization_members', {
        p_organization_id: organizationId,
        p_search: search.trim(),
      }),
      supabase
        .from('user_badges')
        .select('user_id')
        .eq('badge_id', activeBadgeId)
        .eq('is_visible', true),
    ]);
    setBusy(false);
    if (membersResult.error || awardsResult.error) {
      setError(membersResult.error?.message || awardsResult.error?.message || 'Could not load club members.');
      return false;
    }

    setMembers((membersResult.data || []) as ClubMember[]);
    setAwardedUserIds(new Set((awardsResult.data || []).map((row) => row.user_id)));
    setDidSearch(true);
    return true;
  };

  const createBadge = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setBusy(true);
    setError('');
    setNotice('');
    const { data, error: createError } = await supabase.rpc('create_club_badge', {
      p_organization_id: organizationId,
      p_name: String(values.get('badge_name') || '').trim(),
      p_description: String(values.get('badge_description') || '').trim(),
      p_color: String(values.get('badge_color') || 'blue'),
    });
    setBusy(false);
    if (createError || typeof data !== 'string') {
      setError(createError?.message || 'The badge was created without returning its identifier.');
      return;
    }

    form.reset();
    setSelectedBadgeId(data);
    setMembers([]);
    setAwardedUserIds(new Set());
    setDidSearch(false);
    setNotice('Badge created. Search for an active club member to award it.');
    await onBadgesChanged();
  };

  const toggleAward = async (member: ClubMember) => {
    const awarded = awardedUserIds.has(member.user_id);
    setBusy(true);
    setError('');
    setNotice('');
    const { error: awardError } = await supabase.rpc('set_club_member_badge', {
      p_badge_id: activeBadgeId,
      p_user_id: member.user_id,
      p_awarded: !awarded,
    });
    if (awardError) {
      setError(awardError.message);
      setBusy(false);
      return;
    }

    const refreshed = await searchMembers();
    if (refreshed) {
      setNotice(awarded ? `Badge removed from ${member.full_name}.` : `Badge awarded to ${member.full_name}.`);
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-blue-100 bg-white p-4">
      <h5 className="font-semibold text-[#001533]">Club badges</h5>
      <p className="mt-1 text-xs text-gray-500">Create badges for club achievements and award them to active members.</p>
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
      <form onSubmit={createBadge} className="mt-4 grid gap-2 sm:grid-cols-2">
        <input required name="badge_name" minLength={2} maxLength={40} placeholder="Badge name" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <select name="badge_color" className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
          <option value="blue">Blue</option>
          <option value="green">Green</option>
          <option value="purple">Purple</option>
          <option value="amber">Amber</option>
          <option value="rose">Rose</option>
        </select>
        <input name="badge_description" maxLength={200} placeholder="What is this badge for? (optional)" className="rounded-lg border border-gray-300 px-3 py-2 text-sm sm:col-span-2" />
        <button type="submit" disabled={busy} className="rounded-lg bg-[#0047B3] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2 sm:justify-self-start">
          Create badge
        </button>
      </form>

      {badges.length > 0 && (
        <form onSubmit={(event) => void searchMembers(event)} className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <select
            required
            value={selectedBadgeId || badges[0]?.id || ''}
            onChange={(event) => {
              setSelectedBadgeId(event.target.value);
              setMembers([]);
              setAwardedUserIds(new Set());
              setDidSearch(false);
            }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            {badges.map((badge) => <option key={badge.id} value={badge.id}>{badge.name}</option>)}
          </select>
          <input value={search} onChange={(event) => setSearch(event.target.value)} minLength={2} placeholder="Find active member by name" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <button type="submit" disabled={busy} className="rounded-lg border border-[#0047B3] px-4 py-2 text-sm font-semibold text-[#0047B3] disabled:opacity-50">
            {busy ? 'Loading...' : 'Find member'}
          </button>
        </form>
      )}

      {members.length > 0 && (
        <ul className="mt-3 divide-y rounded-lg border">
          {members.map((member) => {
            const awarded = awardedUserIds.has(member.user_id);
            return (
              <li key={member.user_id} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="text-sm font-medium">{member.full_name}</span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void toggleAward(member)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${awarded ? 'border border-red-200 text-red-700' : 'bg-green-700 text-white'}`}
                >
                  {awarded ? 'Remove badge' : 'Award badge'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {didSearch && members.length === 0 && (
        <p className="mt-3 text-sm text-gray-500">No active club members matched that name.</p>
      )}
    </div>
  );
}
