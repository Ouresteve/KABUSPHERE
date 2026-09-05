'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { enforceEmailRestriction } from '@/lib/auth';
import { CheckCircle, AlertCircle, Loader, MessageCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

type VerificationStatus = 'verifying' | 'success' | 'denied';

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState<VerificationStatus>('verifying');
  const [message, setMessage] = useState('Verifying your access...');
  
  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          router.push('/login');
          return;
        }

        const result = await enforceEmailRestriction();

        if (!result.allowed) {
          setStatus('denied');
          setMessage('Only @kabarak.ac.ke emails are allowed');
          setTimeout(() => {
            router.push('/login?error=unauthorized');
          }, 5000);
        } else {
          setStatus('success');
          setMessage('Access verified successfully!');
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .maybeSingle();
          const destination = profile?.role === 'admin' ? '/admin' : '/profile';
          setTimeout(() => {
            router.push(destination);
          }, 2000);
        }
      } catch (error) {
        setStatus('denied');
        setMessage('Verification failed. Please try again.');
        setTimeout(() => {
          router.push('/login');
        }, 4000);
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001533] to-[#0047B3] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        
        {/* Verifying State */}
        {status === 'verifying' && (
          <div className="bg-white rounded-3xl p-8 shadow-2xl text-center space-y-6">
            <div className="flex justify-center">
              <div className="relative w-20 h-20 flex items-center justify-center">
                <div className="absolute inset-0 bg-[#0047B3]/10 rounded-full animate-pulse" />
                <Loader className="w-10 h-10 text-[#0047B3] animate-spin" />
              </div>
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-[#001533] mb-2">
                Verifying Access
              </h2>
              <p className="text-gray-600">
                {message}
              </p>
            </div>

            <div className="pt-4">
              <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-[#0047B3] rounded-full animate-[pulse_1.5s_infinite]" style={{width: '60%'}} />
              </div>
            </div>
          </div>
        )}

        {/* Success State */}
        {status === 'success' && (
          <div className="bg-white rounded-3xl p-8 shadow-2xl text-center space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-green-500/20 rounded-full scale-150 animate-pulse" />
                <CheckCircle className="w-20 h-20 text-green-500 relative z-10" />
              </div>
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-[#001533] mb-2">
                Verified!
              </h2>
              <p className="text-gray-600">
                {message}
              </p>
            </div>

            <div className="pt-4">
              <p className="text-sm text-gray-500">Redirecting...</p>
            </div>
          </div>
        )}

        {/* Denied State */}
        {status === 'denied' && (
          <div className="bg-white rounded-3xl p-8 shadow-2xl text-center space-y-6">
            <div className="flex justify-center">
              <AlertCircle className="w-20 h-20 text-red-500" />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-[#001533] mb-2">
                Access Denied
              </h2>
              <p className="text-gray-600 mb-4">
                {message}
              </p>
              <p className="text-sm text-gray-500 bg-gray-50 rounded-2xl p-4 mb-4">
                KABUSphere is currently available for Kabarak University students with institutional emails.
              </p>
            </div>

            {/* Support Contact */}
            <div className="space-y-3 pt-4 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-700">Need help?</p>
              <a
                href="https://wa.me/254792959161?text=Hi%20KABUSphere%20team%2C%20I%20need%20help%20with%20account%20access"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-2xl gap-2 transition"
              >
                <MessageCircle className="w-5 h-5" />
                Contact Support on WhatsApp
              </a>
              <p className="text-xs text-gray-400">+254792959161</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}