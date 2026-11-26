'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  ArrowLeft,
  Check,
  X,
  Calendar,
  ImagePlus,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { UserName, type UserBadge } from '@/components/UserName';
import { ClubBadgeManager } from '@/components/ClubBadgeManager';

// ─── Types ───────────────────────────────────────────────────────────────────

type ClubRole = 'club_admin' | 'membership_manager' | 'event_manager';

type ClubInfo = {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  logo_url: string | null;
};

type JoinRequest = {
  user_id: string;
  full_name: string;
  requested_at: string;
  badges: UserBadge[];
};

type ActiveMember = {
  user_id: string;
  full_name: string;
  role: ClubRole;
};

type ClubBadge = {
  id: string;
  name: string;
  description: string;
  color: string;
};

type ClubEvent = {
  id: string;
  title: string;
  description: string;
  location: string;
  event_date: string;
  is_cancelled: boolean;
  created_at: string;
};

type Announcement = { id: string; title: string; body: string; is_pinned: boolean; created_at: string; author_name: string };

type ManageData = {
  club: ClubInfo;
  caller_role: ClubRole;
  pending_requests: JoinRequest[];
  active_members: ActiveMember[];
  club_badges: ClubBadge[];
};

type CloudinaryUploadResponse = {
  secure_url?: string;
  error?: { message?: string };
};

// ─── Constants ───────────────────────────────────────────────────────────────

const categories = [
  'Student club',
  'Academic society',
  'Award programme',
  'Sports and recreation',
  'Culture and arts',
  'Volunteering',
  'Other',
];

const roleFriendly: Record<ClubRole, string> = {
  club_admin: 'Club admin',
  membership_manager: 'Membership manager',
  event_manager: 'Event manager',
};

// ─── Cloudinary upload ───────────────────────────────────────────────────────

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
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: 'POST', body },
    );
    const result = (await response.json()) as CloudinaryUploadResponse;
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

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ClubManagePage({ params }: { params: { slug: string } }) {
  const router = useRouter();

  // Core data
  const [manageData, setManageData] = useState<ManageData | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [permissionError, setPermissionError] = useState<'forbidden' | 'not_found' | null>(null);

  // Active tab
  const [activeTab, setActiveTab] = useState('');

  // Global banners
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Busy keys for action buttons
  const [busyKey, setBusyKey] = useState('');

  // ── Overview tab state ──────────────────────────────────────────────────
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState(categories[0]);
  const [editDescription, setEditDescription] = useState('');
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [editLogoPreview, setEditLogoPreview] = useState<string | null>(null);

  // ── Events tab state ────────────────────────────────────────────────────
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Announcements tab state ─────────────────────────────────────────────
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [annPinned, setAnnPinned] = useState(false);

  // ── Fetch manage data ───────────────────────────────────────────────────

  const fetchManageData = async () => {
    const { data, error: rpcError } = await supabase.rpc('get_club_manage_data', {
      p_slug: params.slug,
    });

    if (rpcError) {
      if (rpcError.code === '42501' || rpcError.message?.toLowerCase().includes('do not manage')) {
        setPermissionError('forbidden');
      } else {
        setPermissionError('not_found');
      }
      setPageLoading(false);
      return;
    }

    if (!data) {
      setPermissionError('not_found');
      setPageLoading(false);
      return;
    }

    const md = data as ManageData;
    setManageData(md);
    setEditName(md.club.name);
    setEditCategory(md.club.category);
    setEditDescription(md.club.description);
    setPageLoading(false);
  };

  const refreshManageData = async () => {
    const { data, error: rpcError } = await supabase.rpc('get_club_manage_data', {
      p_slug: params.slug,
    });
    if (!rpcError && data) {
      setManageData(data as ManageData);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchManageData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.slug]);

  // Set default tab once data loads
  useEffect(() => {
    if (!manageData || activeTab) return;
    const role = manageData.caller_role;
    /* eslint-disable react-hooks/set-state-in-effect */
    if (role === 'club_admin') {
      setActiveTab('Overview');
    } else if (role === 'membership_manager') {
      setActiveTab('Members');
    } else {
      setActiveTab('Events');
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [manageData, activeTab]);

  // Cleanup logo preview URL
  useEffect(() => {
    return () => {
      if (editLogoPreview) URL.revokeObjectURL(editLogoPreview);
    };
  }, [editLogoPreview]);

  // ── Events tab: load events when tab activates ──────────────────────────

  const loadEvents = async (organizationId: string) => {
    setEventsLoading(true);
    const { data, error: evErr } = await supabase.rpc('get_club_events', {
      p_organization_id: organizationId,
    });
    setEventsLoading(false);
    if (evErr) {
      setError(evErr.message);
      return;
    }
    setEvents((data as ClubEvent[]) ?? []);
  };

  const loadAnnouncements = async (organizationId: string) => {
    setAnnouncementsLoading(true);
    const { data, error: annErr } = await supabase.rpc('get_club_announcements', { p_organization_id: organizationId });
    setAnnouncementsLoading(false);
    if (annErr) { setError(annErr.message); return; }
    setAnnouncements((data as Announcement[]) ?? []);
  };

  useEffect(() => {
    if (activeTab === 'Events' && manageData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadEvents(manageData.club.id);
    }
    if (activeTab === 'Announcements' && manageData) {
      void loadAnnouncements(manageData.club.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, manageData?.club.id]);

  // ── Countdown ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);

    const upcoming = events
      .filter((e) => !e.is_cancelled && new Date(e.event_date) > new Date())
      .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())[0];

    if (!upcoming) return;

    const tick = () => {
      const diff = new Date(upcoming.event_date).getTime() - Date.now();
      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setCountdown({ days, hours, minutes, seconds });
    };

    tick();
    countdownRef.current = setInterval(tick, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [events]);

  // ─── Derived values ───────────────────────────────────────────────────────

  const visibleTabs = (() => {
    if (!manageData) return [] as string[];
    const role = manageData.caller_role;
    const tabs: string[] = [];
    if (role === 'club_admin') tabs.push('Overview');
    if (role === 'club_admin' || role === 'membership_manager') tabs.push('Members');
    if (role === 'club_admin' || role === 'event_manager') tabs.push('Events');
    if (role === 'club_admin' || role === 'event_manager') tabs.push('Announcements');
    if (role === 'club_admin') tabs.push('Badges');
    return tabs;
  })();

  const nearestUpcoming = events
    .filter((e) => !e.is_cancelled && new Date(e.event_date) > new Date())
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())[0];

  // ─── Action handlers ──────────────────────────────────────────────────────

  const handleSaveDetails = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!manageData) return;
    setBusyKey('save-details');
    setError('');
    setNotice('');

    let logoUrl = manageData.club.logo_url;
    if (editLogoFile) {
      const result = await uploadClubLogo(editLogoFile);
      if ('error' in result) {
        setError(result.error);
        setBusyKey('');
        return;
      }
      logoUrl = result.url;
    }

    const { error: updateError } = await supabase.rpc('update_organization_details', {
      p_organization_id: manageData.club.id,
      p_name: editName.trim(),
      p_category: editCategory,
      p_description: editDescription.trim(),
      p_logo_url: logoUrl,
    });

    if (updateError) {
      setError(updateError.message);
    } else {
      setNotice('Club details updated.');
      await refreshManageData();
    }
    setBusyKey('');
  };

  const handleReviewRequest = async (
    userId: string,
    approved: boolean,
  ) => {
    if (!manageData) return;
    const key = `${userId}:${approved ? 'approve' : 'decline'}`;
    setBusyKey(key);
    setError('');
    setNotice('');

    const { error: reviewError } = await supabase.rpc('review_organization_join_request', {
      p_organization_id: manageData.club.id,
      p_user_id: userId,
      p_approved: approved,
    });

    if (reviewError) {
      setError(reviewError.message);
    } else {
      setNotice(approved ? 'Request approved.' : 'Request declined.');
      await refreshManageData();
    }
    setBusyKey('');
  };

  const handleRemoveMember = async (userId: string) => {
    if (!manageData) return;
    const key = `${userId}:remove`;
    setBusyKey(key);
    setError('');
    setNotice('');

    const { error: removeError } = await supabase.rpc('remove_club_member', {
      p_organization_id: manageData.club.id,
      p_user_id: userId,
    });

    if (removeError) {
      setError(removeError.message);
    } else {
      setNotice('Member removed.');
      await refreshManageData();
    }
    setBusyKey('');
  };

  const handleUpsertEvent = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!manageData) return;
    setBusyKey('upsert-event');
    setError('');
    setNotice('');

    const { error: upsertError } = await supabase.rpc('upsert_club_event', {
      p_organization_id: manageData.club.id,
      p_event_id: editingEventId ?? null,
      p_title: eventTitle.trim(),
      p_description: eventDescription.trim(),
      p_location: eventLocation.trim(),
      p_event_date: new Date(eventDate).toISOString(),
    });

    if (upsertError) {
      setError(upsertError.message);
    } else {
      setNotice(editingEventId ? 'Event updated.' : 'Event created.');
      setEventTitle('');
      setEventDescription('');
      setEventLocation('');
      setEventDate('');
      setEditingEventId(null);
      await loadEvents(manageData.club.id);
    }
    setBusyKey('');
  };

  const handleCancelEvent = async (eventId: string) => {
    if (!manageData) return;
    const key = `${eventId}:cancel`;
    setBusyKey(key);
    setError('');
    setNotice('');

    const { error: cancelError } = await supabase.rpc('cancel_club_event', {
      p_organization_id: manageData.club.id,
      p_event_id: eventId,
    });

    if (cancelError) {
      setError(cancelError.message);
    } else {
      setNotice('Event cancelled.');
      await loadEvents(manageData.club.id);
    }
    setBusyKey('');
  };

  const handlePostAnnouncement = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!manageData) return;
    setBusyKey('post-ann');
    setError('');
    setNotice('');
    const { error: postErr } = await supabase.rpc('post_club_announcement', {
      p_organization_id: manageData.club.id,
      p_title: annTitle.trim(),
      p_body: annBody.trim(),
      p_is_pinned: annPinned,
    });
    if (postErr) { setError(postErr.message); } else {
      setNotice('Announcement posted.');
      setAnnTitle('');
      setAnnBody('');
      setAnnPinned(false);
      await loadAnnouncements(manageData.club.id);
    }
    setBusyKey('');
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!manageData) return;
    const key = `del-ann:${id}`;
    setBusyKey(key);
    setError('');
    setNotice('');
    const { error: delErr } = await supabase.rpc('delete_club_announcement', {
      p_organization_id: manageData.club.id,
      p_announcement_id: id,
    });
    if (delErr) { setError(delErr.message); } else {
      setNotice('Announcement deleted.');
      await loadAnnouncements(manageData.club.id);
    }
    setBusyKey('');
  };

  const startEditEvent = (ev: ClubEvent) => {
    setEditingEventId(ev.id);
    setEventTitle(ev.title);
    setEventDescription(ev.description);
    setEventLocation(ev.location);
    // Convert ISO to datetime-local value (drop seconds+tz)
    const local = new Date(ev.event_date);
    const pad = (n: number) => String(n).padStart(2, '0');
    setEventDate(
      `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}T${pad(local.getHours())}:${pad(local.getMinutes())}`,
    );
  };

  // ─── Loading skeleton ─────────────────────────────────────────────────────

  if (pageLoading) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] p-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="h-14 animate-pulse rounded-2xl bg-blue-50" />
          <div className="h-32 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-32 animate-pulse rounded-2xl bg-slate-200" />
        </div>
      </main>
    );
  }

  // ─── Error states ─────────────────────────────────────────────────────────

  if (permissionError) {
    const isForbidden = permissionError === 'forbidden';
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-6">
        <div className="w-full max-w-sm rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-red-700">
            {isForbidden
              ? 'You do not have permission to manage this club.'
              : 'Club not found.'}
          </p>
          <button
            type="button"
            onClick={() => router.push('/clubs')}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0047B3] px-4 py-2 text-sm font-semibold text-white hover:bg-[#003B99]"
          >
            <ArrowLeft className="h-4 w-4" />
            Clubs
          </button>
        </div>
      </main>
    );
  }

  if (!manageData) return null;

  const { club, caller_role, pending_requests, active_members, club_badges } = manageData;

  // ─── Page ─────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-[#F8FAFC] pb-24 text-[#001533]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-white px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => router.push('/clubs')}
            className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-[#001533] hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Clubs
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-3">
            {club.logo_url ? (
              <Image
                src={club.logo_url}
                alt={`${club.name} logo`}
                width={40}
                height={40}
                className="h-10 w-10 shrink-0 rounded-lg border object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-sm font-bold text-[#0047B3]">
                {club.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold uppercase tracking-wide text-[#0047B3]">
                {club.category}
              </p>
              <p className="truncate font-bold">{club.name}</p>
            </div>
          </div>

          <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#0047B3]">
            {roleFriendly[caller_role]}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6">
        {/* Global banners */}
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}
        {notice && (
          <div
            role="status"
            className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
          >
            {notice}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
          {visibleTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setError('');
                setNotice('');
                setActiveTab(tab);
              }}
              className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab
                  ? 'bg-[#0047B3] text-white'
                  : 'border border-gray-200 text-[#001533] hover:bg-gray-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── Overview tab ────────────────────────────────────────────── */}
        {activeTab === 'Overview' && caller_role === 'club_admin' && (
          <section className="space-y-6">
            {/* Stats strip */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-white p-4 shadow-sm text-center">
                <p className="text-2xl font-bold text-[#0047B3]">{active_members.length}</p>
                <p className="mt-1 text-xs text-gray-500">Active members</p>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-sm text-center">
                <p className="text-2xl font-bold text-[#0047B3]">{pending_requests.length}</p>
                <p className="mt-1 text-xs text-gray-500">Pending requests</p>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-sm text-center">
                <p className="text-2xl font-bold text-[#0047B3]">{club_badges.length}</p>
                <p className="mt-1 text-xs text-gray-500">Club badges</p>
              </div>
            </div>

            {/* Edit form */}
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="font-bold">Club details</h2>
              <form onSubmit={(e) => void handleSaveDetails(e)} className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-gray-700">
                  Club name
                  <input
                    required
                    minLength={2}
                    maxLength={100}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-base text-[#001533] outline-none focus:border-[#0047B3]"
                  />
                </label>

                <label className="text-sm font-medium text-gray-700">
                  Category
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-[#001533] outline-none focus:border-[#0047B3]"
                  >
                    {categories.map((cat) => (
                      <option key={cat}>{cat}</option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-medium text-gray-700 sm:col-span-2">
                  Description
                  <textarea
                    required
                    minLength={10}
                    maxLength={1000}
                    rows={4}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="mt-2 w-full resize-y rounded-xl border border-gray-300 px-4 py-3 text-base text-[#001533] outline-none focus:border-[#0047B3]"
                  />
                </label>

                <div className="sm:col-span-2">
                  <p className="text-sm font-medium text-gray-700">Club logo (optional)</p>
                  <div className="mt-2 flex flex-wrap items-center gap-4">
                    {editLogoPreview ? (
                      <Image
                        src={editLogoPreview}
                        alt="Logo preview"
                        width={64}
                        height={64}
                        unoptimized
                        className="h-16 w-16 rounded-xl border object-cover"
                      />
                    ) : club.logo_url ? (
                      <Image
                        src={club.logo_url}
                        alt="Current club logo"
                        width={64}
                        height={64}
                        className="h-16 w-16 rounded-xl border object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-blue-50 text-[#0047B3]">
                        <ImagePlus className="h-6 w-6" />
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
                          setError('Choose a PNG, JPEG, or WebP image for the club logo.');
                          e.target.value = '';
                          return;
                        }
                        if (file.size > 5 * 1024 * 1024) {
                          setError('Club logos must be 5 MB or smaller.');
                          e.target.value = '';
                          return;
                        }
                        setError('');
                        if (editLogoPreview) URL.revokeObjectURL(editLogoPreview);
                        setEditLogoFile(file);
                        setEditLogoPreview(URL.createObjectURL(file));
                      }}
                      className="block max-w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-semibold file:text-[#0047B3]"
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">PNG, JPEG, or WebP; up to 5 MB.</p>
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={busyKey === 'save-details'}
                    className="rounded-xl bg-[#0047B3] px-5 py-3 font-semibold text-white hover:bg-[#003B99] disabled:opacity-60"
                  >
                    {busyKey === 'save-details' ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}

        {/* ── Members tab ─────────────────────────────────────────────── */}
        {activeTab === 'Members' &&
          (caller_role === 'club_admin' || caller_role === 'membership_manager') && (
            <section className="space-y-6">
              {/* Pending requests */}
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="font-bold">Pending requests</h2>
                {pending_requests.length === 0 ? (
                  <p className="mt-3 text-sm text-gray-500">No pending membership requests.</p>
                ) : (
                  <ul className="mt-3 divide-y">
                    {pending_requests.map((req) => (
                      <li
                        key={req.user_id}
                        className="flex flex-wrap items-center justify-between gap-3 py-3"
                      >
                        <div>
                          <UserName name={req.full_name} badges={req.badges} />
                          <p className="mt-0.5 text-xs text-gray-500">
                            {new Date(req.requested_at).toLocaleDateString('en-KE', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={
                              busyKey === `${req.user_id}:approve` ||
                              busyKey === `${req.user_id}:decline`
                            }
                            onClick={() => void handleReviewRequest(req.user_id, true)}
                            className="inline-flex items-center gap-1 rounded-xl bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            <Check className="h-4 w-4" />
                            {busyKey === `${req.user_id}:approve` ? 'Approving...' : 'Approve'}
                          </button>
                          <button
                            type="button"
                            disabled={
                              busyKey === `${req.user_id}:approve` ||
                              busyKey === `${req.user_id}:decline`
                            }
                            onClick={() => void handleReviewRequest(req.user_id, false)}
                            className="inline-flex items-center gap-1 rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            <X className="h-4 w-4" />
                            {busyKey === `${req.user_id}:decline` ? 'Declining...' : 'Decline'}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Active members */}
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="font-bold">Active members</h2>
                {active_members.length === 0 ? (
                  <p className="mt-3 text-sm text-gray-500">No active members yet.</p>
                ) : (
                  <ul className="mt-3 divide-y">
                    {active_members.map((member) => (
                      <li
                        key={member.user_id}
                        className="flex flex-wrap items-center justify-between gap-3 py-3"
                      >
                        <div>
                          <p className="font-medium">{member.full_name}</p>
                          <span className="mt-0.5 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-[#0047B3]">
                            {roleFriendly[member.role] ?? member.role}
                          </span>
                        </div>
                        {caller_role === 'club_admin' && (
                          <button
                            type="button"
                            disabled={busyKey === `${member.user_id}:remove`}
                            onClick={() => void handleRemoveMember(member.user_id)}
                            className="rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            {busyKey === `${member.user_id}:remove` ? 'Removing...' : 'Remove'}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          )}

        {/* ── Events tab ──────────────────────────────────────────────── */}
        {activeTab === 'Events' &&
          (caller_role === 'club_admin' || caller_role === 'event_manager') && (
            <section className="space-y-6">
              {/* Countdown widget */}
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="mb-3 font-bold">Next event</h2>
                {eventsLoading ? (
                  <div className="h-16 animate-pulse rounded-xl bg-blue-50" />
                ) : nearestUpcoming ? (
                  <div>
                    <p className="font-semibold">{nearestUpcoming.title}</p>
                    <p className="mt-0.5 text-sm text-gray-500">
                      {new Date(nearestUpcoming.event_date).toLocaleString('en-KE', {
                        dateStyle: 'full',
                        timeStyle: 'short',
                      })}
                    </p>
                    <div className="mt-3 flex gap-4">
                      {(
                        [
                          { label: 'Days', value: countdown.days },
                          { label: 'Hrs', value: countdown.hours },
                          { label: 'Min', value: countdown.minutes },
                          { label: 'Sec', value: countdown.seconds },
                        ] as { label: string; value: number }[]
                      ).map(({ label, value }) => (
                        <div key={label} className="rounded-xl bg-[#F8FAFC] px-4 py-3 text-center">
                          <p className="text-2xl font-bold text-[#0047B3]">
                            {String(value).padStart(2, '0')}
                          </p>
                          <p className="text-xs text-gray-500">{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No upcoming events.</p>
                )}
              </div>

              {/* Event form */}
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="font-bold">{editingEventId ? 'Edit event' : 'Create event'}</h2>
                <form
                  onSubmit={(e) => void handleUpsertEvent(e)}
                  className="mt-4 grid gap-4 sm:grid-cols-2"
                >
                  <label className="text-sm font-medium text-gray-700 sm:col-span-2">
                    Title
                    <input
                      required
                      minLength={2}
                      maxLength={120}
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-base text-[#001533] outline-none focus:border-[#0047B3]"
                    />
                  </label>

                  <label className="text-sm font-medium text-gray-700">
                    Location
                    <input
                      maxLength={120}
                      value={eventLocation}
                      onChange={(e) => setEventLocation(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-base text-[#001533] outline-none focus:border-[#0047B3]"
                    />
                  </label>

                  <label className="text-sm font-medium text-gray-700">
                    Date &amp; time
                    <input
                      required
                      type="datetime-local"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-base text-[#001533] outline-none focus:border-[#0047B3]"
                    />
                  </label>

                  <label className="text-sm font-medium text-gray-700 sm:col-span-2">
                    Description
                    <textarea
                      maxLength={500}
                      rows={3}
                      value={eventDescription}
                      onChange={(e) => setEventDescription(e.target.value)}
                      className="mt-2 w-full resize-y rounded-xl border border-gray-300 px-4 py-3 text-base text-[#001533] outline-none focus:border-[#0047B3]"
                    />
                  </label>

                  <div className="flex gap-3 sm:col-span-2">
                    <button
                      type="submit"
                      disabled={busyKey === 'upsert-event'}
                      className="rounded-xl bg-[#0047B3] px-5 py-3 font-semibold text-white hover:bg-[#003B99] disabled:opacity-60"
                    >
                      {busyKey === 'upsert-event'
                        ? 'Saving...'
                        : editingEventId
                          ? 'Update event'
                          : 'Create event'}
                    </button>
                    {editingEventId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingEventId(null);
                          setEventTitle('');
                          setEventDescription('');
                          setEventLocation('');
                          setEventDate('');
                        }}
                        className="rounded-xl border border-gray-200 px-5 py-3 font-semibold text-[#001533] hover:bg-gray-50"
                      >
                        Cancel edit
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Events list */}
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="font-bold">All events</h2>
                {eventsLoading ? (
                  <div className="mt-3 space-y-2">
                    <div className="h-16 animate-pulse rounded-xl bg-blue-50" />
                    <div className="h-16 animate-pulse rounded-xl bg-blue-50" />
                  </div>
                ) : events.length === 0 ? (
                  <p className="mt-3 text-sm text-gray-500">No events yet.</p>
                ) : (
                  <ul className="mt-3 divide-y">
                    {events.map((ev) => (
                      <li
                        key={ev.id}
                        className={`py-3 ${ev.is_cancelled ? 'opacity-50' : ''}`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p
                              className={`font-semibold ${ev.is_cancelled ? 'line-through' : ''}`}
                            >
                              {ev.title}
                            </p>
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                              <Calendar className="h-3 w-3" />
                              {new Date(ev.event_date).toLocaleString('en-KE', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </p>
                            {ev.location && (
                              <p className="mt-0.5 text-xs text-gray-500">{ev.location}</p>
                            )}
                            {ev.description && (
                              <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                                {ev.description}
                              </p>
                            )}
                          </div>
                          {!ev.is_cancelled && (
                            <div className="flex shrink-0 gap-2">
                              <button
                                type="button"
                                onClick={() => startEditEvent(ev)}
                                className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-[#001533] hover:bg-gray-50"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                disabled={busyKey === `${ev.id}:cancel`}
                                onClick={() => void handleCancelEvent(ev.id)}
                                className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                              >
                                {busyKey === `${ev.id}:cancel` ? 'Cancelling...' : 'Cancel event'}
                              </button>
                            </div>
                          )}
                          {ev.is_cancelled && (
                            <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                              Cancelled
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          )}

        {/* ── Badges tab ──────────────────────────────────────────────── */}
        {activeTab === 'Badges' && caller_role === 'club_admin' && (
          <section>
            <ClubBadgeManager
              organizationId={club.id}
              badges={club_badges}
              onBadgesChanged={refreshManageData}
            />
          </section>
        )}

        {/* ── Announcements tab ────────────────────────────────────────── */}
        {activeTab === 'Announcements' && (caller_role === 'club_admin' || caller_role === 'event_manager') && (
          <section className="space-y-6">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="font-bold">Post announcement</h2>
              <form onSubmit={(e) => void handlePostAnnouncement(e)} className="mt-4 space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                  Title
                  <input required maxLength={120} value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-base text-[#001533] outline-none focus:border-[#0047B3]" />
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  Body
                  <textarea required maxLength={2000} rows={4} value={annBody} onChange={(e) => setAnnBody(e.target.value)} className="mt-2 w-full resize-y rounded-xl border border-gray-300 px-4 py-3 text-base text-[#001533] outline-none focus:border-[#0047B3]" />
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input type="checkbox" checked={annPinned} onChange={(e) => setAnnPinned(e.target.checked)} className="h-4 w-4 rounded" />
                  Pin this announcement
                </label>
                <button type="submit" disabled={busyKey === 'post-ann'} className="rounded-xl bg-[#0047B3] px-5 py-3 font-semibold text-white hover:bg-[#003B99] disabled:opacity-60">
                  {busyKey === 'post-ann' ? 'Posting...' : 'Post announcement'}
                </button>
              </form>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="font-bold">All announcements</h2>
              {announcementsLoading ? (
                <div className="mt-3 space-y-2">
                  <div className="h-16 animate-pulse rounded-xl bg-blue-50" />
                  <div className="h-16 animate-pulse rounded-xl bg-blue-50" />
                </div>
              ) : announcements.length === 0 ? (
                <p className="mt-3 text-sm text-gray-500">No announcements yet.</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {announcements.map((ann) => (
                    <li key={ann.id} className={ann.is_pinned ? 'rounded-2xl bg-amber-50 border border-amber-200 p-4' : 'rounded-2xl bg-white border border-gray-100 shadow-sm p-4'}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          {ann.is_pinned && <p className="text-xs text-amber-700 font-semibold mb-1">📌 Pinned</p>}
                          <p className="font-bold text-[#001533]">{ann.title}</p>
                          <p className="mt-1 text-sm text-gray-700 leading-relaxed">{ann.body}</p>
                          <p className="mt-2 text-xs text-gray-400">{ann.author_name} · {new Date(ann.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        </div>
                        <button
                          type="button"
                          disabled={busyKey === `del-ann:${ann.id}`}
                          onClick={() => void handleDeleteAnnouncement(ann.id)}
                          className="shrink-0 rounded-xl border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          {busyKey === `del-ann:${ann.id}` ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
