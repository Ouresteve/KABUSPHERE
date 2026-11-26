'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, BadgeCheck, Building2, Clock3, ImagePlus, LoaderCircle, Plus, Search, Users, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

type ClubRow = {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  logo_url: string | null;
  campuses: { name: string }[] | null;
};

type MembershipRow = {
  organization_id: string;
  user_id: string;
  role: string;
  status: 'pending' | 'active' | 'rejected' | 'left';
};

export type ClubBadge = {
  id: string;
  name: string;
  description: string;
  color: string;
};

type Club = ClubRow & {
  member_count: number;
  membership_status?: MembershipRow['status'];
  is_manager: boolean;
  is_club_admin: boolean;
  next_event_date: string | null;
};

type ClubApplication = {
  id: string;
  name: string;
  logo_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

async function uploadClubLogo(file: File): Promise<{ url: string } | { error: string }> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset) {
    return { error: 'Club logo uploads are not configured. Please contact support.' };
  }

  const body = new FormData();
  body.append('file', file);
  body.append('upload_preset', uploadPreset);
  body.append('folder', 'kabusphere/clubs');

  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body,
    });
    const result = (await response.json()) as { secure_url?: string; error?: { message?: string } };
    if (!response.ok) {
      return { error: result.error?.message || 'The club logo could not be uploaded.' };
    }
    if (!result.secure_url?.startsWith(`https://res.cloudinary.com/${cloudName}/image/upload/`)) {
      return { error: 'Cloudinary returned an invalid club logo URL.' };
    }
    return { url: result.secure_url };
  } catch (uploadError) {
    return {
      error: uploadError instanceof Error ? uploadError.message : 'The club logo upload failed.',
    };
  }
}

const categories = [
  'Student club',
  'Academic society',
  'Award programme',
  'Sports and recreation',
  'Culture and arts',
  'Volunteering',
  'Other',
];

function formatCountdown(eventDate: string): string {
  const ms = new Date(eventDate).getTime() - Date.now();
  if (ms <= 0) return 'Today';
  const days = Math.floor(ms / 86400000);
  if (days >= 1) return days === 1 ? '1 day' : `${days} days`;
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  return `${hours}h ${mins}m`;
}

export default function ClubsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [applications, setApplications] = useState<ClubApplication[]>([]);
  const [campusId, setCampusId] = useState('');
  const [applicantName, setApplicantName] = useState('');
  const [search, setSearch] = useState('');
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [clubName, setClubName] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [description, setDescription] = useState('');
  const [clubLogo, setClubLogo] = useState<{ file: File; preview: string } | null>(null);
  const [authorityConfirmed, setAuthorityConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [busyRequest, setBusyRequest] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const loadGeneration = useRef(0);

  const loadData = useCallback(async () => {
    const generation = ++loadGeneration.current;
    const [campusResult, clubsResult, countsResult] = await Promise.all([
      supabase.from('campuses').select('id').eq('slug', 'kabarak-university').single(),
      supabase
        .from('organizations')
        .select('id, name, slug, category, description, logo_url, campuses(name)')
        .eq('status', 'active')
        .order('name'),
      supabase.rpc('get_public_club_member_counts'),
    ]);

    if (generation !== loadGeneration.current) return;

    if (campusResult.error || clubsResult.error || countsResult.error) {
      setError(
        campusResult.error?.message ||
          clubsResult.error?.message ||
          countsResult.error?.message ||
          'Could not load the clubs directory.',
      );
      setLoading(false);
      return;
    }

    setError('');
    setCampusId(campusResult.data.id);

    let membershipRows: MembershipRow[] = [];
    let userApplications: ClubApplication[] = [];

    if (user) {
      const [membershipsResult, applicationsResult] = await Promise.all([
        supabase
          .from('organization_memberships')
          .select('organization_id, user_id, role, status')
          .eq('user_id', user.id),
        supabase
          .from('organization_applications')
          .select('id, name, logo_url, status, created_at')
          .eq('applicant_id', user.id)
          .order('created_at', { ascending: false }),
      ]);

      if (generation !== loadGeneration.current) return;

      if (membershipsResult.error || applicationsResult.error) {
        setError(
          membershipsResult.error?.message ||
            applicationsResult.error?.message ||
            'Could not load your club activity.',
        );
        setLoading(false);
        return;
      }

      membershipRows = (membershipsResult.data || []) as MembershipRow[];
      userApplications = (applicationsResult.data || []) as ClubApplication[];
    }

    const managerClubIds = user
      ? Array.from(
          new Set(
            membershipRows
              .filter(
                (membership) =>
                  membership.user_id === user.id &&
                  membership.status === 'active' &&
                  ['club_admin', 'membership_manager'].includes(membership.role),
              )
              .map((membership) => membership.organization_id),
          ),
        )
      : [];
    const adminClubIds = user
      ? membershipRows
          .filter(
            (membership) =>
              membership.user_id === user.id &&
              membership.status === 'active' &&
              membership.role === 'club_admin',
          )
          .map((membership) => membership.organization_id)
      : [];

    if (generation !== loadGeneration.current) return;

    const counts = new Map<string, number>(
      ((countsResult.data || []) as { organization_id: string; member_count: number }[]).map(
        (row) => [row.organization_id, Number(row.member_count)],
      ),
    );

    const clubsArray = (clubsResult.data || []) as ClubRow[];

    const eventResults =
      user && clubsArray.length > 0
        ? await Promise.all(
            clubsArray.map((c) =>
              supabase.rpc('get_club_events', { p_organization_id: c.id }),
            ),
          )
        : [];

    if (generation !== loadGeneration.current) return;

    const nextEventByClub = new Map<string, string | null>();
    for (let i = 0; i < clubsArray.length; i++) {
      const rows = (eventResults[i]?.data || []) as { event_date: string; is_cancelled: boolean }[];
      const future = rows.filter((e) => !e.is_cancelled && new Date(e.event_date) > new Date());
      nextEventByClub.set(clubsArray[i].id, future[0]?.event_date ?? null);
    }

    setClubs(
      clubsArray.map((club) => ({
        ...club,
        member_count: counts.get(club.id) || 0,
        membership_status: membershipRows.find(
          (membership) =>
            membership.organization_id === club.id && membership.user_id === user?.id,
        )?.status,
        is_manager: managerClubIds.includes(club.id),
        is_club_admin: adminClubIds.includes(club.id),
        next_event_date: nextEventByClub.get(club.id) ?? null,
      })),
    );
    setApplications(userApplications);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    return () => {
      if (clubLogo) URL.revokeObjectURL(clubLogo.preview);
    };
  }, [clubLogo]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) void loadData();
    });
    return () => {
      active = false;
      loadGeneration.current += 1;
    };
  }, [loadData]);

  const filteredClubs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return clubs;
    return clubs.filter((club) =>
      `${club.name} ${club.category} ${club.description}`.toLowerCase().includes(query),
    );
  }, [clubs, search]);

  const requestToJoin = async (club: Club) => {
    if (!user) {
      router.push('/login');
      return;
    }

    setBusyRequest(`${club.id}:join`);
    setError('');
    setNotice('');
    const { error: requestError } = await supabase.rpc('request_to_join_organization', {
      p_organization_id: club.id,
    });

    if (requestError) {
      setError(requestError.message);
    } else {
      setNotice(`Your request to join ${club.name} was sent to its club leaders.`);
      await loadData();
    }
    setBusyRequest('');
  };

  const submitClubApplication = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
      router.push('/login');
      return;
    }
    if (!campusId || !user.email) {
      setError('We could not verify your campus account. Please sign in again and retry.');
      return;
    }

    setSubmitting(true);
    setError('');
    setNotice('');
    let logoUrl: string | null = null;
    if (clubLogo) {
      const uploadResult = await uploadClubLogo(clubLogo.file);
      if ('error' in uploadResult) {
        setError(uploadResult.error);
        setSubmitting(false);
        return;
      }
      logoUrl = uploadResult.url;
    }

    const { error: applicationError } = await supabase
      .from('organization_applications')
      .insert({
        campus_id: campusId,
        applicant_id: user.id,
        applicant_name: applicantName.trim(),
        applicant_email: user.email,
        authority_confirmed: authorityConfirmed,
        logo_url: logoUrl,
        name: clubName.trim(),
        category,
        description: description.trim(),
      });

    if (applicationError) {
      setError(applicationError.message);
    } else {
      setNotice('Your club application was submitted for KABUSphere admin review.');
      setShowApplicationForm(false);
      setClubName('');
      setCategory(categories[0]);
      setDescription('');
      setAuthorityConfirmed(false);
      setClubLogo(null);
      await loadData();
    }
    setSubmitting(false);
  };

  const hasPendingApplication = applications.some(
    (application) => application.status === 'pending',
  );

  return (
    <main className="min-h-screen bg-[#F8FAFC] pb-24 text-[#001533]">
      <header className="sticky top-0 z-40 border-b bg-white px-4 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0047B3]">
              Kabarak University
            </p>
            <h1 className="mt-1 text-2xl font-bold">Clubs</h1>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!user) {
                router.push('/login');
                return;
              }
              setShowApplicationForm((open) => !open);
            }}
            disabled={hasPendingApplication}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#0047B3] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#003B99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">
              {hasPendingApplication ? 'Application pending' : 'Add a club'}
            </span>
            <span className="sm:hidden">{hasPendingApplication ? 'Pending' : 'Add'}</span>
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
        <section className="rounded-3xl bg-gradient-to-br from-[#001533] to-[#0047B3] p-6 text-white sm:p-9">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-white/10 p-3">
              <Building2 className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-2xl font-bold sm:text-3xl">Find your campus community</h2>
              <p className="mt-2 max-w-2xl leading-relaxed text-blue-100">
                Explore Kabarak clubs and student groups. Request to join and a club leader
                will review your membership.
              </p>
            </div>
          </div>
        </section>

        {error && (
          <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            {notice}
          </p>
        )}

        {showApplicationForm && (
          <section className="mt-6 rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">Apply to add a club</h2>
                <p className="mt-1 text-sm text-gray-600">
                  KABUSphere will verify each club before it appears in the directory.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowApplicationForm(false)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                aria-label="Close application form"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={submitClubApplication} className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-gray-700">
                Club name
                <input
                  required
                  minLength={2}
                  maxLength={100}
                  value={clubName}
                  onChange={(event) => setClubName(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-base text-[#001533] outline-none focus:border-[#0047B3]"
                  placeholder="e.g. President's Award"
                />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Category
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-[#001533] outline-none focus:border-[#0047B3]"
                >
                  {categories.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-gray-700 sm:col-span-2">
                Your name (club contact)
                <input
                  required
                  minLength={2}
                  maxLength={120}
                  value={applicantName}
                  onChange={(event) => setApplicantName(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-base text-[#001533] outline-none focus:border-[#0047B3]"
                  placeholder={String(user?.user_metadata?.full_name || user?.user_metadata?.name || 'Your full name')}
                />
              </label>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700" htmlFor="club-logo">
                  Club logo (optional)
                </label>
                <div className="mt-2 flex flex-wrap items-center gap-4">
                  {clubLogo ? (
                    <Image
                      src={clubLogo.preview}
                      alt="Selected club logo preview"
                      width={64}
                      height={64}
                      unoptimized
                      className="h-16 w-16 rounded-xl border object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-blue-50 text-[#0047B3]">
                      <ImagePlus className="h-6 w-6" />
                    </div>
                  )}
                  <input
                    id="club-logo"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
                        setError('Choose a PNG, JPEG, or WebP image for the club logo.');
                        event.target.value = '';
                        return;
                      }
                      if (file.size > 5 * 1024 * 1024) {
                        setError('Club logos must be 5 MB or smaller.');
                        event.target.value = '';
                        return;
                      }
                      setError('');
                      setClubLogo({ file, preview: URL.createObjectURL(file) });
                    }}
                    className="block max-w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-semibold file:text-[#0047B3]"
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">PNG, JPEG, or WebP; up to 5 MB.</p>
              </div>
              <label className="flex items-start gap-3 text-sm leading-relaxed text-gray-700 sm:col-span-2">
                <input
                  required
                  type="checkbox"
                  checked={authorityConfirmed}
                  onChange={(event) => setAuthorityConfirmed(event.target.checked)}
                  className="mt-1 h-4 w-4 accent-[#0047B3]"
                />
                <span>I am authorized to submit this application on behalf of this club, and its leaders can verify the details.</span>
              </label>
              <label className="text-sm font-medium text-gray-700 sm:col-span-2">
                What is the club about?
                <textarea
                  required
                  minLength={10}
                  maxLength={1000}
                  rows={4}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="mt-2 w-full resize-y rounded-xl border border-gray-300 px-4 py-3 text-base text-[#001533] outline-none focus:border-[#0047B3]"
                  placeholder="Describe the club, its activities, and who can join."
                />
              </label>
              <p className="text-xs leading-relaxed text-gray-500 sm:col-span-2">
                Your Kabarak sign-in email and contact name will be shared with KABUSphere
                administrators to review this application.
              </p>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-[#0047B3] px-5 py-3 font-semibold text-white hover:bg-[#003B99] disabled:opacity-60 sm:col-span-2 sm:justify-self-start"
              >
                {submitting ? 'Submitting...' : 'Submit for review'}
              </button>
            </form>
          </section>
        )}

        {applications.length > 0 && (
          <section className="mt-8 rounded-2xl border border-blue-100 bg-white p-5">
            <h2 className="font-bold">Your club applications</h2>
            <ul className="mt-3 divide-y">
              {applications.map((application) => (
                <li key={application.id} className="flex items-center justify-between gap-4 py-3">
                  <span className="font-medium">{application.name}</span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      application.status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : application.status === 'rejected'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {application.status}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Browse clubs</h2>
            <p className="mt-1 text-sm text-gray-600">
              Approved groups at Kabarak University.
            </p>
          </div>
          <label className="relative block sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search clubs"
              aria-label="Search clubs"
              className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-[#0047B3]"
            />
          </label>
        </div>

        {loading || authLoading ? (
          <div role="status" aria-live="polite" className="mt-6">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-[#0047B3]">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Loading campus clubs...
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-56 animate-pulse rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex gap-4">
                  <div className="h-14 w-14 rounded-xl bg-blue-50" />
                  <div className="flex-1 space-y-3 pt-1">
                    <div className="h-3 w-24 rounded bg-slate-200" />
                    <div className="h-5 w-36 rounded bg-slate-200" />
                    <div className="h-3 w-28 rounded bg-slate-100" />
                  </div>
                </div>
                <div className="mt-7 space-y-3">
                  <div className="h-3 w-full rounded bg-slate-100" />
                  <div className="h-3 w-4/5 rounded bg-slate-100" />
                  <div className="mt-5 h-10 rounded-xl bg-blue-50" />
                </div>
              </div>
            ))}
            </div>
          </div>
        ) : filteredClubs.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
            <Users className="mx-auto h-10 w-10 text-[#0047B3]" />
            <h3 className="mt-4 text-lg font-bold">
              {search ? 'No clubs match that search' : 'The directory is getting started'}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-600">
              {search
                ? 'Try another name or category.'
                : 'No clubs have been approved yet. You can apply to add one, and it will appear here after review.'}
            </p>
            {!search && (
              <button
                type="button"
                onClick={() => {
                  if (!user) {
                    router.push('/login');
                    return;
                  }
                  setShowApplicationForm(true);
                }}
                disabled={hasPendingApplication}
                className="mt-5 rounded-xl bg-[#0047B3] px-5 py-3 text-sm font-semibold text-white hover:bg-[#003B99] disabled:opacity-50"
              >
                Apply to add a club
              </button>
            )}
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredClubs.map((club) => (
              <article key={club.id} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <Link href={`/clubs/${club.slug}`} className="block">
                  <div className="flex items-start gap-4 p-5">
                    {club.logo_url ? (
                      <Image
                        src={club.logo_url}
                        alt={`${club.name} logo`}
                        width={56}
                        height={56}
                        className="h-14 w-14 shrink-0 rounded-xl border object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg font-bold text-[#0047B3]">
                        {club.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#0047B3]">
                        {club.category}
                      </p>
                      <h3 className="mt-1 break-words text-lg font-bold">{club.name}</h3>
                      <p className="mt-1 text-xs text-gray-500">
                        {club.campuses?.[0]?.name || 'Kabarak University'}
                      </p>
                    </div>
                  </div>
                </Link>
                <div className="px-5 pb-5">
                  <p className="line-clamp-3 min-h-[4.5rem] text-sm leading-relaxed text-gray-600">
                    {club.description}
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                    <Users className="h-4 w-4 text-[#0047B3]" />
                    <span>{club.member_count} members</span>
                  </div>

                  {club.next_event_date && (
                    <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#0047B3]">
                      <Clock3 className="h-3 w-3" />
                      {formatCountdown(club.next_event_date)}
                    </div>
                  )}

                  {club.membership_status === 'active' ? (
                    <div className="mt-4 flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
                      <BadgeCheck className="h-4 w-4" /> Member
                    </div>
                  ) : club.membership_status === 'pending' ? (
                    <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                      <Clock3 className="h-4 w-4" /> Request pending
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void requestToJoin(club)}
                      disabled={busyRequest === `${club.id}:join` || authLoading}
                      className="mt-4 w-full rounded-xl border border-[#0047B3] px-4 py-3 text-sm font-semibold text-[#0047B3] transition hover:bg-blue-50 disabled:opacity-60"
                    >
                      {busyRequest === `${club.id}:join`
                        ? 'Sending request...'
                        : club.membership_status === 'rejected'
                          ? 'Request to join again'
                          : 'Request to join'}
                    </button>
                  )}

                  {(club.is_manager || club.is_club_admin) && (
                    <Link
                      href={`/clubs/${club.slug}/manage`}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0047B3] px-4 py-3 text-sm font-semibold text-white hover:bg-[#003B99]"
                    >
                      Manage club <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
