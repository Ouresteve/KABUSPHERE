'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Eye, EyeOff, PackageCheck, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

type Listing = {
  id: string;
  title: string;
  price: number;
  status: 'Active' | 'Sold' | 'Hidden' | 'Removed';
  product_images?: { image_url: string; display_order: number }[];
};

export default function ManageListingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchListings = async () => {
      const { data, error: listingsError } = await supabase
        .from('products')
        .select('id, title, price, status, product_images(image_url, display_order)')
        .eq('seller_id', user.id)
        .neq('status', 'Removed')
        .order('created_at', { ascending: false });
      if (listingsError) setError('Could not load your listings. Please try again.');
      else setListings((data || []) as Listing[]);
      setLoading(false);
    };
    fetchListings();
  }, [authLoading, user, router]);

  const updateStatus = async (id: string, status: Listing['status']) => {
    const { error: updateError } = await supabase.from('products').update({ status }).eq('id', id).eq('seller_id', user?.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setListings((current) => current.map((listing) => listing.id === id ? { ...listing, status } : listing));
  };

  const removeListing = async (id: string) => {
    if (!window.confirm('Remove this listing from the marketplace?')) return;
    const { error: deleteError } = await supabase.from('products').delete().eq('id', id).eq('seller_id', user?.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setListings((current) => current.filter((listing) => listing.id !== id));
  };

  return (
    <main className="min-h-screen bg-[#F8FAFC] pb-10">
      <header className="border-b bg-white px-4 py-4">
        <div className="mx-auto flex max-w-4xl items-center gap-4"><button onClick={() => router.push('/profile')} className="rounded-xl p-2 text-gray-700 hover:bg-gray-100" aria-label="Back to profile"><ArrowLeft className="h-5 w-5" /></button><div><p className="text-xs font-semibold uppercase tracking-wider text-[#0047B3]">Seller tools</p><h1 className="text-xl font-bold text-[#001533]">Manage listings</h1></div></div>
      </header>
      <section className="mx-auto max-w-4xl space-y-4 px-4 py-6 lg:px-8 lg:py-10">
        {error && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {loading ? <div className="h-32 animate-pulse rounded-2xl bg-white" /> : listings.length === 0 ? <div className="rounded-2xl bg-white p-10 text-center shadow-sm"><h2 className="font-semibold text-[#001533]">No listings yet</h2><p className="mt-2 text-sm text-gray-500">Items you list will appear here.</p><button onClick={() => router.push('/market/list')} className="mt-5 rounded-xl bg-[#0047B3] px-5 py-3 text-sm font-semibold text-white">List an item</button></div> : listings.map((listing) => {
          const image = listing.product_images?.slice().sort((a, b) => a.display_order - b.display_order)[0]?.image_url;
          return <article key={listing.id} className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm sm:flex-row sm:items-center"><div className="h-24 w-full shrink-0 overflow-hidden rounded-xl bg-gray-100 sm:h-24 sm:w-32">{image && <img src={image} alt="" className="h-full w-full object-cover" />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate font-semibold text-[#001533]">{listing.title}</h2><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${listing.status === 'Active' ? 'bg-green-100 text-green-700' : listing.status === 'Sold' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{listing.status}</span></div><p className="mt-1 font-bold text-[#0047B3]">KSh {Number(listing.price).toLocaleString()}</p></div><div className="flex flex-wrap gap-2"><button onClick={() => updateStatus(listing.id, listing.status === 'Active' ? 'Hidden' : 'Active')} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">{listing.status === 'Active' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}{listing.status === 'Active' ? 'Hide' : 'Publish'}</button><button onClick={() => updateStatus(listing.id, listing.status === 'Sold' ? 'Active' : 'Sold')} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"><PackageCheck className="h-4 w-4" />{listing.status === 'Sold' ? 'Relist' : 'Sold'}</button><button onClick={() => removeListing(listing.id)} className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100"><Trash2 className="h-4 w-4" />Remove</button></div></article>;
        })}
      </section>
    </main>
  );
}
