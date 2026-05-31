'use client';

import { useState } from 'react';
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
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001533] via-[#003B99] to-[#0055CC] flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        
        {/* Blue Header */}
        <div className="bg-gradient-to-br from-[#001533] to-[#0047B3] px-8 py-12 text-center">
          <div className="flex justify-center mb-6">
            <Image
              src="/images/logo.jpeg"
              alt="KABUSphere Logo"
              width={100}
              height={100}
              className="rounded-full drop-shadow-xl"
            />
          </div>

          <h1 className="text-4xl font-extrabold italic tracking-tight">
            <span className="text-[#0055CC]">KABU</span>
            <span className="text-white">SPHERE</span>
          </h1>
          <p className="text-teal-100 mt-3 text-lg font-medium">
            Delivering Trust • Every Time
          </p>
        </div>

        {/* White Content Area */}
        <div className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-gray-800">Welcome Back</h2>
            <p className="text-gray-600 mt-2">Sign in to connect with your campus</p>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-4 bg-white border-2 border-gray-200 hover:border-gray-300 active:scale-[0.985] transition-all py-4 rounded-2xl text-lg font-medium text-gray-800"
          >
            {loading ? "Connecting to " : "Continue with "}
            <img 
              src="https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png" 
              alt="Google" 
              className="h-7"
            />
            
          </button>

          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500">
              Only <span className="font-medium text-[#0055CC]">@kabarak.ac.ke</span> emails allowed
            </p>
          </div>

          {message && (
            <p className="text-center mt-6 text-sm text-red-600 bg-red-50 py-3 rounded-2xl">
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}