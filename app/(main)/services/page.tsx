'use client';

import { useState, useEffect } from 'react';
import { Truck, Shirt, Droplet, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

export default function ServicesPage() {
  const { user } = useAuth();
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkVote = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('votes')
        .select('id')
        .eq('user_id', user.id)
        .eq('feature_name', 'campus_services')
        .single();

      setHasVoted(!!data);
    };

    checkVote();
  }, [user]);

  const handleVote = async () => {
    if (!user || hasVoted) return;

    setLoading(true);
    const { error } = await supabase
      .from('votes')
      .insert({
        user_id: user.id,
        feature_name: 'campus_services'
      });

    if (!error) {
      setHasVoted(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <div className="sticky top-0 bg-white border-b z-40 px-4 py-4">
        <h1 className="text-2xl font-bold text-[#001533]">Services</h1>
      </div>

      <div className="p-4">
        <div className="bg-white rounded-3xl p-8 text-center">
          <div className="flex justify-center gap-6 mb-6">
            <Truck className="w-12 h-12 text-[#0047B3]" />
            <Shirt className="w-12 h-12 text-[#0047B3]" />
            <Droplet className="w-12 h-12 text-[#0047B3]" />
          </div>

          <h2 className="text-2xl font-bold text-[#001533]">Campus Services</h2>
          <p className="text-gray-600 mt-3 leading-relaxed">
            All Products Delivery, Laundry Services, Water Refill and Delivery and more are coming soon to KABUSphere
          </p>

          <button
            onClick={handleVote}
            disabled={hasVoted || loading}
            className={`mt-10 w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-3 transition-all ${
              hasVoted 
                ? 'bg-green-100 text-green-700' 
                : 'bg-[#0047B3] text-white hover:bg-[#003B99]'
            }`}
          >
            {hasVoted ? (
              <>
                <Check className="w-5 h-5" />
                Voted • Thank you!
              </>
            ) : (
              "Vote for Campus Services"
            )}
          </button>
        </div>

        <div className="mt-8 text-center text-gray-500 text-sm">
          More student-friendly services coming soon...
        </div>
      </div>
    </div>
  );
}