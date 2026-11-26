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
type ClubOption = { id: string; name: string };
type ClubRole = 'club_admin' | 'membership_manager' | 'event_manager' | 'member';
type CampusUser = {
  user_id: string;
  full_name: string;
  email: string;
  membership_role: ClubRole | null;
  membership_status: 'pending' | 'active' | 'rejected' | 'left' | null;
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
  const [selectedClubId, setSelectedClubId] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userSearchCompleted, setUserSearchCompleted] = useState(false);
  const [campusUsers, setCampusUsers] = useState<CampusUser[]>([]);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, ClubRole>>({});
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
      const [users, online, listings, activeListings, onlineAccountsResult, applicationsResult, clubsResult] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).neq('role', 'admin'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).neq('role', 'admin').gte('last_seen_at', onlineSince),
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'Active'),
        supabase.rpc('get_online_admin_accounts'),
        supabase.from('organization_applications').select('id, name, logo_url, category, description, applicant_name, applicant_email, authority_confirmed, created_at, campuses(name)').eq('status', 'pending').order('created_at', { ascending: true }),
        supabase.from('organizations').select('id, name').eq('status', 'active').order('name'),
      ]);
      if (users.error || online.error || listings.error || activeListings.error || onlineAccountsResult.error) setError('Some dashboard metrics could not be loaded. Run the admin online-accounts SQL setup if the account list is unavailable.');
      if (applicationsResult.error) setApplicationsError(applicationsResult.error.message);
      if (clubsResult.error) setRoleManagementError(clubsResult.error.message);
      const activeClubs = (clubsResult.data || []) as ClubOption[];
      setClubs(activeClubs);
      if (activeClubs.length > 0) setSelectedClubId(activeClubs[0].id);
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
      p_organization_id: organizationId,
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
    return true;
  };

  const searchUsers = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = userSearch.trim();
    if (!selectedClubId) {
      setRoleManagementError('Approve a club before assigning membership roles.');
      return;
    }
    if (query.length < 2) {
      setRoleManagementError('Enter at least two characters to search.');
      return;
    }

    setRoleManagementNotice('');
    await loadCampusUsers(query, selectedClubId);
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

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-6 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between"><div><button onClick={() => router.push('/profile')} className="mb-4 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#0047B3]"><ArrowLeft className="h-4 w-4" /> Profile</button><p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-[#0047B3]"><ShieldCheck className="h-4 w-4" /> Admin console</p><h1 className="mt-2 text-3xl font-bold text-[#001533]">KABUSphere overview</h1></div></header>
        {error && <p className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
        {loading ? <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-32 animate-pulse rounded-2xl bg-white" />)}</div> : stats && <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><StatCard icon={Users} label="Total users" value={stats.totalUsers} /><StatCard icon={Activity} label="Online now" value={stats.onlineUsers} accent /><StatCard icon={Package} label="Total listings" value={stats.totalListings} /><StatCard icon={ShieldCheck} label="Active listings" value={stats.activeListings} /></div>}
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
                      <div className="flex shrink-0 gap-2">
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
                          {assigningUserId === account.user_id ? 'Saving...' : 'Assign'}
                        </button>
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