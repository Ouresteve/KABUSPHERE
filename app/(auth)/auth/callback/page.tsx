'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { enforceEmailRestriction } from '@/lib/auth';




export const dynamic = 'force-dynamic';



export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState('Verifying your access...');
  
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
          setStatus(`Access denied. Only @kabarak.ac.ke emails are allowed. Contact us for special accounts`);
          setTimeout(() => {
            router.push('/login?error=unauthorized');
          }, 4500);
        } else {
          setStatus('Welcome to KABUSphere!');
          router.push('/onboarding');
        }
      } catch (error) {
        router.push('/login');
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-lg text-black">{status}</p>
      </div>
    </div>
  );
}