'use client';

import { useEffect, useState } from 'react';
import { Activity, ArrowLeft, Package, ShieldCheck, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

type AdminStats = { totalUsers: number; onlineUsers: number; totalListings: number; activeListings: number };

export default function AdminPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      const onlineSince = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const [users, online, listings, activeListings] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('last_seen_at', onlineSince),
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'Active'),
      ]);
      if (users.error || online.error || listings.error || activeListings.error) setError('Some dashboard metrics could not be loaded.');
      setStats({ totalUsers: users.count || 0, onlineUsers: online.count || 0, totalListings: listings.count || 0, activeListings: activeListings.count || 0 });
      setLoading(false);
    };
    loadDashboard();
  }, [authLoading, user, router]);

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-6 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between"><div><button onClick={() => router.push('/profile')} className="mb-4 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#0047B3]"><ArrowLeft className="h-4 w-4" /> Profile</button><p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-[#0047B3]"><ShieldCheck className="h-4 w-4" /> Admin console</p><h1 className="mt-2 text-3xl font-bold text-[#001533]">KABUSphere overview</h1></div></header>
        {error && <p className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
        {loading ? <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-32 animate-pulse rounded-2xl bg-white" />)}</div> : stats && <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><StatCard icon={Users} label="Total users" value={stats.totalUsers} /><StatCard icon={Activity} label="Online now" value={stats.onlineUsers} accent /><StatCard icon={Package} label="Total listings" value={stats.totalListings} /><StatCard icon={ShieldCheck} label="Active listings" value={stats.activeListings} /></div>}
        <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm"><h2 className="text-lg font-bold text-[#001533]">Next admin tools</h2><p className="mt-2 text-sm leading-relaxed text-gray-500">Moderation, reports, featured listings, and user management can be added here as marketplace activity grows.</p></section>
      </div>
    </main>
  );
}

function StatCard({ icon: Icon, label, value, accent = false }: { icon: typeof Users; label: string; value: number; accent?: boolean }) {
  return <div className="rounded-2xl bg-white p-5 shadow-sm"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-[#0047B3]'}`}><Icon className="h-5 w-5" /></div><p className="mt-5 text-sm text-gray-500">{label}</p><p className="mt-1 text-3xl font-bold text-[#001533]">{value}</p></div>;
}