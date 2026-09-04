'use client';

import { useState } from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setMessage('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setMessage(error.message);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#001533] p-4 lg:flex lg:items-center lg:justify-center lg:p-8">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl lg:min-h-[680px] lg:grid-cols-2">
        <section className="hidden bg-[#0047B3] p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <a href="/" className="inline-flex items-center gap-2 text-sm text-blue-100 hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to marketplace</a>
          <div className="max-w-md"><p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-blue-100"><ShieldCheck className="h-4 w-4" /> Kabarak community</p><h1 className="mt-5 text-5xl font-bold leading-tight">Buy, sell, and connect closer to home.</h1><p className="mt-6 text-lg leading-relaxed text-blue-100">One trusted space for the products and conversations that make campus feel like home.</p></div>
          <p className="text-sm text-blue-100">KABU<span className="font-bold text-white">SPHERE</span> · Delivering trust, every time</p>
        </section>
        <section className="flex items-center justify-center p-6 sm:p-10 lg:p-16">
          <div className="w-full max-w-md">
            <div className="mb-8 text-center lg:hidden"><Image src="/images/logo.jpeg" alt="KABUSphere Logo" width={88} height={88} className="mx-auto rounded-full" /><h1 className="mt-5 text-4xl font-extrabold italic tracking-tight"><span className="text-[#0055CC]">KABU</span><span className="text-[#001533]">SPHERE</span></h1><p className="mt-3 text-lg font-medium text-[#0047B3]">Delivering Trust · Every Time</p></div>
            <div className="hidden text-center lg:block"><p className="text-3xl font-extrabold tracking-tight"><span className="text-[#0055CC]">KABU</span><span className="text-[#001533]">SPHERE</span></p></div>
            <div className="mt-8 text-center"><h2 className="text-2xl font-semibold text-gray-800">Welcome Back</h2><p className="mt-2 text-gray-600">Sign in to connect with your campus</p></div>
            <button onClick={handleGoogleLogin} disabled={loading} className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-gray-200 bg-white py-4 text-lg font-medium text-gray-800 transition hover:border-gray-300 disabled:opacity-60"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#4285F4] text-sm font-bold text-white">G</span>{loading ? 'Connecting...' : 'Continue with Google'}</button>
            <p className="mt-8 text-center text-xs text-gray-500">Only <span className="font-medium text-[#0055CC]">@kabarak.ac.ke</span> emails are allowed</p>
            {message && <p className="mt-6 rounded-2xl bg-red-50 py-3 text-center text-sm text-red-600">{message}</p>}
          </div>
        </section>
      </div>
    </main>
  );
}