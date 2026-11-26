'use client';

import Image from 'next/image';
import { useEffect, useState, type FormEvent } from 'react';
import { Activity, ArrowLeft, Package, ShieldCheck, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

type AdminStats = { totalUsers: number; onlineUsers: number; totalListings: number; activeListings: number };
type OnlineAccount = { id: string; full_name: string | null; email: string | null; last_seen_at: string };
type ClubApplication = {
  id: string;
  name: string;
  logo_url: string | null;
  category: string;
  description: string;
  applicant_name: string;
  applicant_email: string;
  authority_confirmed: boolean;
  created_at: string;
  campuses: { name: string }[] | null;
};
type ClubOption = { id: string; name: string; status: 'active' | 'suspended' };
type CampusOption = { id: string; name: string };
type SchoolOption = { id: string; campus_id: string; name: string };
type SchoolBadge = {
  id: string;
  name: string;
  description: string;
  color: string;
  campus_schools: { name: string }[];
  campuses: { name: string }[];
};
type ClubRole = 'club_admin' | 'membership_manager' | 'event_manager' | 'member';
type CampusUser = {
  user_id: string;
  full_name: string;
  email: string;
  membership_role: ClubRole | null;
  membership_status: 'pending' | 'active' | 'rejected' | 'left' | null;
  verified_school_id: string | null;
  verified_school_name: string | null;
};

const clubRoles: { value: ClubRole; label: string }[] = [
  { value: 'club_admin', label: 'Club administrator' },
  { value: 'membership_manager', label: 'Membership manager' },
  { value: 'event_manager', label: 'Event manager' },
  { value: 'member', label: 'Member' },
];

export default function AdminPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [onlineAccounts, setOnlineAccounts] = useState<OnlineAccount[]>([]);
  const [clubApplications, setClubApplications] = useState<ClubApplication[]>([]);
  const [applicationsError, setApplicationsError] = useState('');
  const [reviewingApplicationId, setReviewingApplicationId] = useState('');
  const [clubs, setClubs] = useState<ClubOption[]>([]);
  const [allClubs, setAllClubs] = useState<ClubOption[]>([]);
  const [campuses, setCampuses] = useState<CampusOption[]>([]);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [schoolBadges, setSchoolBadges] = useState<SchoolBadge[]>([]);
  const [selectedCampusId, setSelectedCampusId] = useState('');
  const [schoolBadgeError, setSchoolBadgeError] = useState('');
  const [schoolBadgeNotice, setSchoolBadgeNotice] = useState('');
  const [creatingSchoolBadge, setCreatingSchoolBadge] = useState(false);
  const [clubStatusBusy, setClubStatusBusy] = useState('');
  const [selectedClubId, setSelectedClubId] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userSearchCompleted, setUserSearchCompleted] = useState(false);
  const [campusUsers, setCampusUsers] = useState<CampusUser[]>([]);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, ClubRole>>({});
  const [schoolDrafts, setSchoolDrafts] = useState<Record<string, string>>({});
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [assigningUserId, setAssigningUserId] = useState('');
  const [roleManagementError, setRoleManagementError] = useState('');
  const [roleManagementNotice, setRoleManagementNotice] = useState('');

  useEffect(() => {
    if (authLoading) return;
    const loadDashboard = async () => {
      if (!user) {
        router.push('/login');
        return;
      }
      const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (profileError || profile?.role !== 'admin') {
        setError('You do not have permission to view this dashboard.');
        setLoading(false);
        return;
      }
      const onlineSince = new Date(Date.now() - 60 * 1000).toISOString();
      const [users, online, listings, activeListings, onlineAccountsResult, applicationsResult, clubsResult, campusesResult, schoolsResult, schoolBadgesResult] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).neq('role', 'admin'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).neq('role', 'admin').gte('last_seen_at', onlineSince),
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'Active'),
        supabase.rpc('get_online_admin_accounts'),
        supabase.from('organization_applications').select('id, name, logo_url, category, description, applicant_name, applicant_email, authority_confirmed, created_at, campuses(name)').eq('status', 'pending').order('created_at', { ascending: true }),
        supabase.from('organizations').select('id, name, status').order('name'),
        supabase.from('campuses').select('id, name').order('name'),
        supabase.from('campus_schools').select('id, campus_id, name').order('name'),
        supabase.from('organization_badges').select('id, name, description, color, campus_schools(name), campuses(name)').eq('kind', 'school').eq('is_active', true).order('name'),
      ]);
      if (users.error || online.error || listings.error || activeListings.error || onlineAccountsResult.error) setError('Some dashboard metrics could not be loaded. Run the admin online-accounts SQL setup if the account list is unavailable.');
      if (applicationsResult.error) setApplicationsError(applicationsResult.error.message);
      if (clubsResult.error) setRoleManagementError(clubsResult.error.message);
      const clubsData = (clubsResult.data || []) as ClubOption[];
      const activeClubs = clubsData.filter((club) => club.status === 'active');
      setAllClubs(clubsData);
      setClubs(activeClubs);
      if (activeClubs.length > 0) setSelectedClubId(activeClubs[0].id);
      const campusData = (campusesResult.data || []) as CampusOption[];
      setCampuses(campusData);
      if (campusData.length > 0) setSelectedCampusId(campusData[0].id);
      setSchools((schoolsResult.data || []) as SchoolOption[]);
      if (schoolsResult.error || schoolBadgesResult.error) {
        setSchoolBadgeError(schoolsResult.error?.message || schoolBadgesResult.error?.message || 'Could not load school badge settings.');
      } else {
        setSchoolBadges((schoolBadgesResult.data || []) as SchoolBadge[]);
      }
      setOnlineAccounts((onlineAccountsResult.data || []) as OnlineAccount[]);
      setClubApplications((applicationsResult.data || []) as ClubApplication[]);
      setStats({ totalUsers: users.count || 0, onlineUsers: online.count || 0, totalListings: listings.count || 0, activeListings: activeListings.count || 0 });
      setLoading(false);
    };
    loadDashboard();
  }, [authLoading, user, router]);

  const reviewClubApplication = async (applicationId: string, approved: boolean) => {
    setReviewingApplicationId(applicationId);
    setApplicationsError('');

    const { error: reviewError } = await supabase.rpc('review_club_application', {
      p_application_id: applicationId,
      p_approved: approved,
      p_review_note: null,
    });

    if (reviewError) {
      setApplicationsError(reviewError.message);
      setReviewingApplicationId('');
      return;
    }

    const { data, error: refreshError } = await supabase
      .from('organization_applications')
      .select('id, name, logo_url, category, description, applicant_name, applicant_email, authority_confirmed, created_at, campuses(name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (refreshError) {
      setApplicationsError(refreshError.message);
    } else {
      setClubApplications((data || []) as ClubApplication[]);
    }
    setReviewingApplicationId('');
  };

  const loadCampusUsers = async (query: string, organizationId: string) => {
    setSearchingUsers(true);
    setRoleManagementError('');
    setUserSearchCompleted(false);
    setCampusUsers([]);
    const { data, error: searchError } = await supabase.rpc('search_campus_users', {
      p_search: query,
      p_organization_id: organizationId || null,
    });
    setSearchingUsers(false);
    if (searchError) {
      setRoleManagementError(searchError.message);
      return false;
    }

    const results = (data || []) as CampusUser[];
    setCampusUsers(results);
    setUserSearchCompleted(true);
    setRoleDrafts(
      Object.fromEntries(
        results.map((account) => [
          account.user_id,
          account.membership_role || 'member',
        ]),
      ),
    );
    setSchoolDrafts(
      Object.fromEntries(results.map((account) => [account.user_id, account.verified_school_id || ''])),
    );
    return true;
  };

  const searchUsers = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = userSearch.trim();
    if (query.length < 2) {
      setRoleManagementError('Enter at least two characters to search.');
      return;
    }

    setRoleManagementNotice('');
    await loadCampusUsers(query, selectedClubId);
  };

  const createSchoolBadge = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setCreatingSchoolBadge(true);
    setSchoolBadgeError('');
    setSchoolBadgeNotice('');
    const { error: createError } = await supabase.rpc('create_school_badge', {
      p_campus_id: selectedCampusId,
      p_school_name: String(formData.get('school_name') || '').trim(),
      p_name: String(formData.get('badge_name') || '').trim(),
      p_description: String(formData.get('badge_description') || '').trim(),
      p_color: String(formData.get('badge_color') || 'blue'),
    });

    if (createError) {
      setSchoolBadgeError(createError.message);
      setCreatingSchoolBadge(false);
      return;
    }

    const [schoolsResult, badgesResult] = await Promise.all([
      supabase.from('campus_schools').select('id, campus_id, name').order('name'),
      supabase.from('organization_badges').select('id, name, description, color, campus_schools(name), campuses(name)').eq('kind', 'school').eq('is_active', true).order('name'),
    ]);
    if (schoolsResult.error || badgesResult.error) {
      setSchoolBadgeError(schoolsResult.error?.message || badgesResult.error?.message || 'The badge was created, but the list could not be refreshed.');
    } else {
      setSchools((schoolsResult.data || []) as SchoolOption[]);
      setSchoolBadges((badgesResult.data || []) as SchoolBadge[]);
      setSchoolBadgeNotice('School badge created. Assign verified school affiliation to eligible users below.');
      form.reset();
    }
    setCreatingSchoolBadge(false);
  };

  const setUserSchool = async (account: CampusUser, schoolId: string) => {
    setAssigningUserId(account.user_id);
    setRoleManagementError('');
    const { error: schoolError } = await supabase.rpc('set_verified_school', {
      p_user_id: account.user_id,
      p_school_id: schoolId || null,
    });
    if (schoolError) {
      setRoleManagementError(schoolError.message);
      setAssigningUserId('');
      return;
    }
    await loadCampusUsers(userSearch.trim(), selectedClubId);
    setAssigningUserId('');
  };

  const setClubStatus = async (club: ClubOption, status: 'active' | 'suspended') => {
    const confirmation = status === 'suspended'
      ? `Take down ${club.name}? It will disappear from the directory, while membership and badge records are retained.`
      : `Reactivate ${club.name}?`;
    if (!window.confirm(confirmation)) return;

    setClubStatusBusy(club.id);
    setRoleManagementError('');
    const { error: statusError } = await supabase.rpc('set_organization_status', {
      p_organization_id: club.id,
      p_status: status,
    });
    if (statusError) {
      setRoleManagementError(statusError.message);
      setClubStatusBusy('');
      return;
    }

    const { data, error: refreshError } = await supabase
      .from('organizations')
      .select('id, name, status')
      .order('name');
    if (refreshError) {
      setRoleManagementError(refreshError.message);
    } else {
      const updatedClubs = (data || []) as ClubOption[];
      setAllClubs(updatedClubs);
      setClubs(updatedClubs.filter((item) => item.status === 'active'));
      if (status === 'suspended' && selectedClubId === club.id) {
        setSelectedClubId(updatedClubs.find((item) => item.status === 'active')?.id || '');
      }
    }
    setClubStatusBusy('');
  };

  const assignClubRole = async (account: CampusUser) => {
    const role = roleDrafts[account.user_id] || 'member';
    setAssigningUserId(account.user_id);
    setRoleManagementError('');
    setRoleManagementNotice('');
    const { error: assignmentError } = await supabase.rpc('assign_organization_role', {
      p_organization_id: selectedClubId,
      p_user_id: account.user_id,
      p_role: role,
    });

    if (assignmentError) {
      setRoleManagementError(assignmentError.message);
      setAssigningUserId('');
      return;
    }

    const refreshed = await loadCampusUsers(userSearch.trim(), selectedClubId);
    if (refreshed) {
      setRoleManagementNotice(`${account.full_name} is now assigned as ${clubRoles.find((item) => item.value === role)?.label || role}.`);
    }
    setAssigningUserId('');
  };

  if (loading) {
    return (
      <main role="status" aria-live="polite" className="min-h-screen bg-[#F8FAFC] px-4 py-8 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="h-8 w-64 animate-pulse rounded-lg bg-blue-100" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-32 animate-pulse rounded-2xl bg-white shadow-sm" />
            ))}
          </div>
          <div className="mt-8 h-72 animate-pulse rounded-2xl bg-white shadow-sm" />
          <span className="sr-only">Loading admin console...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-6 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between"><div><button onClick={() => router.push('/profile')} className="mb-4 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#0047B3]"><ArrowLeft className="h-4 w-4" /> Profile</button><p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-[#0047B3]"><ShieldCheck className="h-4 w-4" /> Admin console</p><h1 className="mt-2 text-3xl font-bold text-[#001533]">KABUSphere overview</h1></div></header>
        {error && <p className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
        {loading ? <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-32 animate-pulse rounded-2xl bg-white" />)}</div> : stats && <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><StatCard icon={Users} label="Total users" value={stats.totalUsers} /><StatCard icon={Activity} label="Online now" value={stats.onlineUsers} accent /><StatCard icon={Package} label="Total listings" value={stats.totalListings} /><StatCard icon={ShieldCheck} label="Active listings" value={stats.activeListings} /></div>}
        <section className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b px-6 py-5">
            <h2 className="text-lg font-bold text-[#001533]">School badges and verified affiliations</h2>
            <p className="mt-1 text-sm text-gray-500">
              Create a school badge, then verify users&apos; school affiliation from the account search below. Eligible users can choose whether to display their badge.
            </p>
          </div>
          {schoolBadgeError && <p role="alert" className="m-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{schoolBadgeError}</p>}
          {schoolBadgeNotice && <p role="status" className="m-5 rounded-xl bg-green-50 p-4 text-sm text-green-800">{schoolBadgeNotice}</p>}
          {campuses.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">No campuses are available to configure school badges.</p>
          ) : (
            <form onSubmit={createSchoolBadge} className="grid gap-3 p-6 sm:grid-cols-2">
              <label className="text-sm font-medium text-gray-700">
                Campus
                <select
                  required
                  value={selectedCampusId}
                  onChange={(event) => setSelectedCampusId(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-3"
                >
                  {campuses.map((campus) => <option key={campus.id} value={campus.id}>{campus.name}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium text-gray-700">
                School name
                <input required name="school_name" maxLength={100} minLength={2} placeholder="School of Science, Engineering and Technology" className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-3" />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Badge label
                <input required name="badge_name" maxLength={40} minLength={2} placeholder="SSET" className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-3" />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Badge color
                <select name="badge_color" className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-3">
                  <option value="blue">Blue</option>
                  <option value="green">Green</option>
                  <option value="purple">Purple</option>
                  <option value="amber">Amber</option>
                  <option value="rose">Rose</option>
                </select>
              </label>
              <label className="text-sm font-medium text-gray-700 sm:col-span-2">
                Description (optional)
                <input name="badge_description" maxLength={200} placeholder="A short explanation shown with the badge" className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-3" />
              </label>
              <button type="submit" disabled={creatingSchoolBadge} className="rounded-xl bg-[#0047B3] px-5 py-3 text-sm font-semibold text-white hover:bg-[#003B99] disabled:opacity-50 sm:col-span-2 sm:justify-self-start">
                {creatingSchoolBadge ? 'Creating badge...' : 'Create school badge'}
              </button>
            </form>
          )}
          {schoolBadges.length > 0 && (
            <ul className="divide-y border-t px-6">
              {schoolBadges.map((badge) => (
                <li key={badge.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <span className="font-semibold text-[#001533]">{badge.name}</span>
                  <span className="text-gray-500">{badge.campus_schools?.[0]?.name} · {badge.campuses?.[0]?.name}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b px-6 py-5">
            <h2 className="text-lg font-bold text-[#001533]">Club availability</h2>
            <p className="mt-1 text-sm text-gray-500">Take a club down without deleting its membership, badge, or review records. You can reactivate it later.</p>
          </div>
          {allClubs.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">No approved clubs yet.</p>
          ) : (
            <ul className="divide-y">
              {allClubs.map((club) => (
                <li key={club.id} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-[#001533]">{club.name}</p>
                    <p className={`mt-1 text-xs font-semibold ${club.status === 'active' ? 'text-green-700' : 'text-red-700'}`}>
                      {club.status === 'active' ? 'Visible in directory' : 'Suspended / taken down'}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={clubStatusBusy === club.id}
                    onClick={() => void setClubStatus(club, club.status === 'active' ? 'suspended' : 'active')}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 ${club.status === 'active' ? 'border border-red-200 text-red-700 hover:bg-red-50' : 'bg-green-700 text-white hover:bg-green-800'}`}
                  >
                    {clubStatusBusy === club.id ? 'Saving...' : club.status === 'active' ? 'Take down' : 'Reactivate'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b px-6 py-5">
            <h2 className="text-lg font-bold text-[#001533]">Club applications</h2>
            <p className="mt-1 text-sm text-gray-500">Review the club details and applicant before publishing a club. The applicant becomes its first club administrator if approved.</p>
          </div>
          {applicationsError && <p role="alert" className="m-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{applicationsError}</p>}
          {clubApplications.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">There are no pending club applications.</p>
          ) : (
            <div className="divide-y">
              {clubApplications.map((application) => (
                <article key={application.id} className="px-6 py-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#0047B3]">{application.category} · {application.campuses?.[0]?.name || 'Campus'}</p>
                      <div className="mt-1 flex items-center gap-3">
                        {application.logo_url && (
                          <Image
                            src={application.logo_url}
                            alt={`${application.name} logo`}
                            width={48}
                            height={48}
                            className="h-12 w-12 rounded-lg border object-cover"
                          />
                        )}
                        <h3 className="text-lg font-bold text-[#001533]">{application.name}</h3>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-600">{application.description}</p>
                      <p className="mt-3 text-sm text-gray-700">Contact: <span className="font-semibold">{application.applicant_name}</span> · {application.applicant_email}</p>
                      {application.authority_confirmed && <p className="mt-1 text-xs text-gray-500">Applicant confirmed they are authorized to represent the club.</p>}
                      <time className="mt-1 block text-xs text-gray-400" dateTime={application.created_at}>{new Date(application.created_at).toLocaleString()}</time>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        disabled={!!reviewingApplicationId}
                        onClick={() => void reviewClubApplication(application.id, false)}
                        className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        {reviewingApplicationId === application.id ? 'Reviewing...' : 'Reject'}
                      </button>
                      <button
                        type="button"
                        disabled={!!reviewingApplicationId}
                        onClick={() => void reviewClubApplication(application.id, true)}
                        className="rounded-xl bg-[#0047B3] px-4 py-2 text-sm font-semibold text-white hover:bg-[#003B99] disabled:opacity-50"
                      >
                        {reviewingApplicationId === application.id ? 'Reviewing...' : 'Approve club'}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        <section className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b px-6 py-5">
            <h2 className="text-lg font-bold text-[#001533]">Club membership roles</h2>
            <p className="mt-1 text-sm text-gray-500">
              Search registered accounts by name or email, then assign a role within one club. Roles do not change a user&apos;s platform-wide permissions.
            </p>
          </div>
          {roleManagementError && <p role="alert" className="m-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{roleManagementError}</p>}
          {roleManagementNotice && <p role="status" className="m-5 rounded-xl bg-green-50 p-4 text-sm text-green-800">{roleManagementNotice}</p>}
          {clubs.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">Approve a club application before managing its members.</p>
          ) : (
            <div className="p-6">
              <form onSubmit={searchUsers} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]">
                <label className="text-sm font-medium text-gray-700">
                  Club
                  <select
                    value={selectedClubId}
                    disabled={searchingUsers || !!assigningUserId}
                    onChange={(event) => {
                      setSelectedClubId(event.target.value);
                      setCampusUsers([]);
                      setUserSearchCompleted(false);
                      setRoleManagementError('');
                      setRoleManagementNotice('');
                    }}
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-3"
                  >
                    <option value="">All users (school verification only)</option>
                    {clubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium text-gray-700">
                  Name or email
                  <input
                    value={userSearch}
                    disabled={searchingUsers || !!assigningUserId}
                    onChange={(event) => {
                      setUserSearch(event.target.value);
                      setUserSearchCompleted(false);
                      setCampusUsers([]);
                    }}
                    minLength={2}
                    maxLength={120}
                    placeholder="Search registered accounts"
                    className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-3"
                  />
                </label>
                <button
                  type="submit"
                  disabled={searchingUsers}
                  className="self-end rounded-xl bg-[#0047B3] px-5 py-3 text-sm font-semibold text-white hover:bg-[#003B99] disabled:opacity-50"
                >
                  {searchingUsers ? 'Searching...' : 'Search users'}
                </button>
              </form>
              {campusUsers.length > 0 && (
                <div className="mt-5 divide-y rounded-xl border">
                  {campusUsers.map((account) => (
                    <div key={account.user_id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="break-words font-semibold text-[#001533]">{account.full_name || 'Unnamed account'}</p>
                        <p className="break-all text-sm text-gray-500">{account.email}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {account.membership_status === 'active'
                            ? `Current role: ${clubRoles.find((item) => item.value === account.membership_role)?.label || account.membership_role}`
                            : account.membership_status
                              ? `Membership: ${account.membership_status}`
                              : 'Not yet a member'}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 sm:items-end">
                        <div className="flex flex-wrap gap-2">
                          <select
                            aria-label={`Verified school for ${account.full_name}`}
                            value={schoolDrafts[account.user_id] ?? account.verified_school_id ?? ''}
                            disabled={!!assigningUserId}
                            onChange={(event) => setSchoolDrafts((current) => ({
                              ...current,
                              [account.user_id]: event.target.value,
                            }))}
                            className="min-w-44 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                          >
                            <option value="">No verified school</option>
                            {schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
                          </select>
                          <button
                            type="button"
                            disabled={!!assigningUserId || searchingUsers}
                            onClick={() => void setUserSchool(account, schoolDrafts[account.user_id] ?? account.verified_school_id ?? '')}
                            className="rounded-lg border border-green-700 px-3 py-2 text-sm font-semibold text-green-800 hover:bg-green-50 disabled:opacity-50"
                          >
                            {assigningUserId === account.user_id ? 'Saving...' : 'Verify school'}
                          </button>
                        </div>
                        {selectedClubId ? (
                          <div className="flex gap-2">
                            <select
                              aria-label={`Role for ${account.full_name}`}
                              value={roleDrafts[account.user_id] || 'member'}
                              disabled={!!assigningUserId}
                              onChange={(event) => {
                                const selectedRole = clubRoles.find((role) => role.value === event.target.value);
                                if (selectedRole) {
                                  setRoleDrafts((current) => ({
                                    ...current,
                                    [account.user_id]: selectedRole.value,
                                  }));
                                }
                              }}
                              className="min-w-44 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                            >
                              {clubRoles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                            </select>
                            <button
                              type="button"
                              disabled={!!assigningUserId || searchingUsers}
                              onClick={() => void assignClubRole(account)}
                              className="rounded-lg border border-[#0047B3] px-4 py-2 text-sm font-semibold text-[#0047B3] hover:bg-blue-50 disabled:opacity-50"
                            >
                              {assigningUserId === account.user_id ? 'Saving...' : 'Assign role'}
                            </button>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500">Choose a club above to assign membership roles.</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {userSearchCompleted && !searchingUsers && campusUsers.length === 0 && (
                <p className="mt-4 text-sm text-gray-500">No registered users matched the last search.</p>
              )}
            </div>
          )}
        </section>
        <section className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm"><div className="border-b px-6 py-5"><h2 className="text-lg font-bold text-[#001533]">Online accounts</h2><p className="mt-1 text-sm text-gray-500">Users active within the last minute, excluding admin accounts.</p></div>{onlineAccounts.length === 0 ? <p className="p-6 text-sm text-gray-500">No community accounts are online right now.</p> : <div className="divide-y">{onlineAccounts.map((account) => <div key={account.id} className="flex flex-col gap-1 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-[#001533]">{account.full_name || 'Unnamed account'}</p><p className="text-sm text-gray-500">{account.email || 'Email unavailable'}</p></div><time className="text-xs text-gray-400" dateTime={account.last_seen_at}>{new Date(account.last_seen_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></div>)}</div>}</section>
        <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm"><h2 className="text-lg font-bold text-[#001533]">Next admin tools</h2><p className="mt-2 text-sm leading-relaxed text-gray-500">Moderation, reports, featured clubs, and additional user management can be added as campus activity grows.</p></section>
      </div>
    </main>
  );
}

function StatCard({ icon: Icon, label, value, accent = false }: { icon: typeof Users; label: string; value: number; accent?: boolean }) {
  return <div className="rounded-2xl bg-white p-5 shadow-sm"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-[#0047B3]'}`}><Icon className="h-5 w-5" /></div><p className="mt-5 text-sm text-gray-500">{label}</p><p className="mt-1 text-3xl font-bold text-[#001533]">{value}</p></div>;
}