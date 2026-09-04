'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, ShieldCheck, Store } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type PreviewProduct = { id: string; title: string; price: number; category: string; product_images?: { image_url: string; display_order: number }[] };

export default function LandingPage() {
  const [products, setProducts] = useState<PreviewProduct[]>([]);
  useEffect(() => {
    const loadProducts = async () => {
      const { data } = await supabase.from('products').select('id, title, price, category, product_images(image_url, display_order)').eq('status', 'Active').order('created_at', { ascending: false }).limit(3);
      setProducts((data || []) as PreviewProduct[]);
    };
    loadProducts();
  }, []);

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#001533]">
      <header className="bg-[#001533] px-5 py-5 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between"><div className="text-xl font-bold tracking-tight"><span className="text-[#0055CC]">KABU</span>SPHERE</div><a href="/login" className="rounded-xl border border-white/30 px-4 py-2 text-sm font-semibold hover:bg-white/10">Sign in</a></div>
      </header>
      <section className="bg-[#001533] px-5 pb-16 pt-10 text-white lg:pb-24 lg:pt-20">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div><p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-blue-200"><ShieldCheck className="h-4 w-4" /> Built for Kabarak</p><h1 className="mt-5 max-w-3xl text-4xl font-bold leading-tight sm:text-5xl lg:text-7xl">The campus market, made closer.</h1><p className="mt-6 max-w-xl text-lg leading-relaxed text-blue-100">Find useful things from your community. Browse first, then sign in when you are ready to buy, sell, or connect.</p><a href="/market" className="mt-8 inline-flex items-center gap-3 rounded-xl bg-white px-5 py-3.5 font-semibold text-[#001533] hover:bg-blue-50">Explore Marketplace <ArrowRight className="h-5 w-5" /></a></div>
          <div className="grid grid-cols-2 gap-4">{products.slice(0, 2).map((product) => <PreviewCard key={product.id} product={product} />)}<div className="flex aspect-square items-center justify-center rounded-3xl bg-[#0055CC] p-8 text-center"><div><Store className="mx-auto h-10 w-10 text-blue-100" /><p className="mt-4 text-2xl font-bold">Buy local.</p><p className="mt-1 text-sm text-blue-100">Sell to your people.</p></div></div></div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-12 lg:py-16"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0047B3]">A better starting point</p><h2 className="mt-2 text-3xl font-bold">See what is available</h2>{products.length ? <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{products.map((product) => <PreviewCard key={product.id} product={product} light />)}</div> : <div className="mt-8 rounded-2xl bg-white p-8 text-center text-gray-500 shadow-sm">The first listings are on their way.</div>}</section>
    </main>
  );
}

function PreviewCard({ product, light = false }: { product: PreviewProduct; light?: boolean }) {
  const image = product.product_images?.sort((a, b) => a.display_order - b.display_order)[0]?.image_url;
  return <div className={`overflow-hidden rounded-2xl ${light ? 'bg-white shadow-sm ring-1 ring-gray-100' : 'bg-white/10 ring-1 ring-white/10'}`}><div className="aspect-[4/3] bg-gray-100">{image ? <img src={image} alt={product.title} className="h-full w-full object-cover" /> : <Store className="mx-auto mt-14 h-10 w-10 text-gray-300" />}</div><div className="p-4"><p className={`text-xs font-semibold uppercase tracking-wider ${light ? 'text-[#0047B3]' : 'text-blue-200'}`}>{product.category}</p><div className="mt-1 flex justify-between gap-2"><h3 className={`truncate font-semibold ${light ? 'text-[#001533]' : 'text-white'}`}>{product.title}</h3><span className={`shrink-0 text-sm font-bold ${light ? 'text-[#0047B3]' : 'text-white'}`}>KSh {Number(product.price).toLocaleString()}</span></div></div></div>;
}
