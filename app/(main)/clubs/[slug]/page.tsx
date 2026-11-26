'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Calendar,
  Clock3,
  MapPin,
  Users,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { UserName, type UserBadge } from '@/components/UserName';

// ─── Types ───────────────────────────────────────────────────────────────────

type ClubRole = 'club_admin' | 'membership_manager' | 'event_manager';

type UpcomingEvent = {
  id: string;
  title: string;
  description: string;
  location: string;
  event_date: string;
};

type ActiveMember = {
  user_id: string;
  full_name: string;
  role: ClubRole;
  badges: UserBadge[];
};

type CallerMembership = {
  status: 'pending' | 'active' | 'rejected' | 'left';
  role: ClubRole;
} | null;

type ClubPublicData = {
  club: {
    id: string;
    name: string;
    slug: string;
    category: string;
    description: string;
    logo_url: string | null;
    campus_name: string;
  };
  member_count: number;
  upcoming_events: UpcomingEvent[];
  active_members: ActiveMember[];
  caller_membership: CallerMembership;
};

type Countdown = { days: number; hours: number; minutes: number; seconds: number };

// ─── Helpers ─────────────────────────────────────────────────────────────────

const roleFriendly: Record<ClubRole, string> = {
  club_admin: 'Club admin',
  membership_manager: 'Membership manager',
  event_manager: 'Event manager',
};

function buildCountdown(eventDate: string): Countdown {
  const diff = new Date(eventDate).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds };
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ClubPortalPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [data, setData] = useState<ClubPublicData | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [busyJoin, setBusyJoin] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinNotice, setJoinNotice] = useState('');

  const [countdown, setCountdown] = useState<Countdown>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch data ──────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setPageLoading(true);
    setFetchError(null);

    const { data: rpcData, error: rpcError } = await supabase.rpc('get_club_public_data', {
      p_slug: params.slug,
    });

    if (rpcError) {
      setFetchError(
        rpcError.code === 'P0002' ? 'Club not found.' : rpcError.message,
      );
      setPageLoading(false);
      return;
    }

    if (!rpcData) {
      setFetchError('Club not found.');
      setPageLoading(false);
      return;
    }

    setData(rpcData as ClubPublicData);
    setPageLoading(false);
  }, [params.slug]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // ── Countdown ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (!data) return;

    const nearest = data.upcoming_events[0];
    if (!nearest) return;

    setCountdown(buildCountdown(nearest.event_date));
    countdownRef.current = setInterval(() => {
      setCountdown(buildCountdown(nearest.event_date));
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [data]);

  // ── Join handler ────────────────────────────────────────────────────────────

  const handleRequestToJoin = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (!data) return;
    setBusyJoin(true);
    setJoinError('');
    setJoinNotice('');

    const { error: joinErr } = await supabase.rpc('request_to_join_organization', {
      p_organization_id: data.club.id,
    });

    if (joinErr) {
      setJoinError(joinErr.message);
    } else {
      setJoinNotice(`Your request to join ${data.club.name} was sent to its club leaders.`);
      await fetchData();
    }
    setBusyJoin(false);
  };

  // ── Loading skeleton ─────────────────────────────────────────────────────────

  if (pageLoading || authLoading) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] p-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="h-10 w-32 animate-pulse rounded-xl bg-blue-50" />
          <div className="h-40 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-32 animate-pulse rounded-2xl bg-white shadow-sm" />
          <div className="h-48 animate-pulse rounded-2xl bg-white shadow-sm" />
          <div className="h-64 animate-pulse rounded-2xl bg-white shadow-sm" />
        </div>
      </main>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────────

  if (fetchError || !data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-6">
        <div className="w-full max-w-sm rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-red-700">
            {fetchError ?? 'Club not found.'}
          </p>
          <button
            type="button"
            onClick={() => router.push('/clubs')}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0047B3] px-4 py-2 text-sm font-semibold text-white hover:bg-[#003B99]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to clubs
          </button>
        </div>
      </main>
    );
  }

  const { club, member_count, upcoming_events, active_members, caller_membership } = data;

  const isManager =
    caller_membership?.status === 'active' &&
    ['club_admin', 'membership_manager', 'event_manager'].includes(caller_membership.role);

  const isAdmin =
    caller_membership?.status === 'active' && caller_membership.role === 'club_admin';

  const displayedMembers = active_members.slice(0, 20);
  const hiddenCount = active_members.length - displayedMembers.length;

  const nearestEvent = upcoming_events[0] ?? null;

  return (
    <main className="min-h-screen bg-[#F8FAFC] pb-24 text-[#001533]">
      {/* ── Back button ─────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-3xl px-4 pt-6">
        <button
          type="button"
          onClick={() => router.push('/clubs')}
          className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-[#001533] hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Clubs
        </button>
      </div>

      <div className="mx-auto max-w-3xl space-y-5 px-4 py-5">
        {/* ── Hero banner ───────────────────────────────────────────────── */}
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="bg-gradient-to-br from-[#001533] to-[#0047B3] px-6 py-8">
            <div className="flex flex-wrap items-center gap-5">
              {club.logo_url ? (
                <Image
                  src={club.logo_url}
                  alt={`${club.name} logo`}
                  width={80}
                  height={80}
                  className="h-20 w-20 shrink-0 rounded-2xl border-2 border-white/20 object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-3xl font-bold text-white">
                  {club.name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-blue-100">
                  {club.category}
                </span>
                <h1 className="mt-1 break-words text-2xl font-bold text-white sm:text-3xl">
                  {club.name}
                </h1>
                <p className="mt-1 text-sm text-blue-200">{club.campus_name}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="h-4 w-4 text-[#0047B3]" />
              <span>
                <strong className="text-[#001533]">{member_count}</strong> members
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {/* Join / status button */}
              {caller_membership?.status === 'active' ? (
                <div className="inline-flex items-center gap-2 rounded-xl bg-green-50 px-4 py-2 text-sm font-semibold text-green-800">
                  <BadgeCheck className="h-4 w-4" /> Member ✓
                </div>
              ) : caller_membership?.status === 'pending' ? (
                <div className="inline-flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800">
                  <Clock3 className="h-4 w-4" /> Request pending
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleRequestToJoin()}
                  disabled={busyJoin}
                  className="rounded-xl bg-[#0047B3] px-4 py-2 text-sm font-semibold text-white hover:bg-[#003B99] disabled:opacity-60"
                >
                  {busyJoin
                    ? 'Sending request...'
                    : caller_membership?.status === 'rejected'
                    ? 'Request to join again'
                    : 'Request to join'}
                </button>
              )}

              {/* Manage link for club officials */}
              {isManager && (
                <Link
                  href={`/clubs/${club.slug}/manage`}
                  className="inline-flex items-center gap-1 rounded-xl border border-[#0047B3] px-4 py-2 text-sm font-semibold text-[#0047B3] hover:bg-blue-50"
                >
                  Manage club <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>

          {/* Join feedback */}
          {joinError && (
            <p className="mx-6 mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {joinError}
            </p>
          )}
          {joinNotice && (
            <p className="mx-6 mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              {joinNotice}
            </p>
          )}
        </section>

        {/* ── About ─────────────────────────────────────────────────────── */}
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">About</h2>
          <p className="mt-3 leading-relaxed text-gray-700">{club.description}</p>
        </section>

        {/* ── Upcoming events ───────────────────────────────────────────── */}
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Upcoming events</h2>

          {upcoming_events.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">No upcoming events scheduled.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {/* Live countdown to nearest event */}
              {nearestEvent && (
                <div className="rounded-xl bg-blue-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#0047B3]">Next event</p>
                  <p className="mt-1 font-bold">{nearestEvent.title}</p>
                  <p className="mt-0.5 text-sm text-gray-600">
                    {new Date(nearestEvent.event_date).toLocaleString('en-KE', {
                      dateStyle: 'full',
                      timeStyle: 'short',
                    })}
                  </p>
                  <div className="mt-3 flex gap-3">
                    {(['days', 'hours', 'minutes', 'seconds'] as const).map((unit) => (
                      <div key={unit} className="text-center">
                        <span className="block text-2xl font-bold text-[#0047B3]">
                          {String(countdown[unit]).padStart(2, '0')}
                        </span>
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                          {unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Event list */}
              <ul className="divide-y">
                {upcoming_events.map((event) => (
                  <li key={event.id} className="py-4 first:pt-0">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                        <Calendar className="h-5 w-5 text-[#0047B3]" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold">{event.title}</p>
                        <p className="mt-0.5 text-sm text-[#0047B3]">
                          {new Date(event.event_date).toLocaleString('en-KE', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </p>
                        {event.location && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                            <MapPin className="h-3 w-3" />
                            {event.location}
                          </p>
                        )}
                        {event.description && (
                          <p className="mt-1 text-sm leading-relaxed text-gray-600">
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* ── Members ───────────────────────────────────────────────────── */}
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Members</h2>

          {active_members.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">No active members yet.</p>
          ) : (
            <div className="mt-4">
              <ul className="divide-y">
                {displayedMembers.map((member) => (
                  <li
                    key={member.user_id}
                    className="flex items-center gap-3 py-3 first:pt-0"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-[#0047B3]">
                      {member.full_name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <UserName
                        name={member.full_name}
                        badges={member.badges}
                        nameClassName="font-medium"
                      />
                      <p className="mt-0.5 text-xs text-gray-500">
                        {roleFriendly[member.role] ?? member.role}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              {hiddenCount > 0 && (
                <p className="mt-3 text-sm text-gray-500">
                  and {hiddenCount} more {hiddenCount === 1 ? 'member' : 'members'}
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
