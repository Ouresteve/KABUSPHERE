'use client';

import { useState, useEffect } from 'react';
import { Store, Plus, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

export default function MarketPage() {
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
        .eq('feature_name', 'p2p_marketplace')
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
        feature_name: 'p2p_marketplace'
      });

    if (!error) {
      setHasVoted(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <div className="sticky top-0 bg-white border-b z-40 px-4 py-4">
        <h1 className="mx-auto max-w-5xl text-2xl font-bold text-[#001533]">KABU Marketplace</h1>
      </div>

      <div className="mx-auto max-w-4xl p-4 lg:px-8 lg:py-8">
        <div className="rounded-3xl bg-white p-8 text-center lg:p-12">
          <Store className="w-16 h-16 mx-auto text-[#0047B3] mb-6" />
          <h2 className="text-2xl font-bold text-[#001533]">P2P Marketplace</h2>
          <p className="text-gray-600 mt-3">
            A secure peer-to-peer marketplace coming soon for Kabarak students
          </p>

          <button
            onClick={handleVote}
            disabled={hasVoted || loading}
            className={`mx-auto mt-8 flex w-full max-w-xl items-center justify-center gap-3 rounded-2xl py-4 font-semibold transition-all ${
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
              "Vote for P2P Marketplace"
            )}
          </button>
        </div>

        <div className="mt-8 text-center text-gray-500">
          <p>More features coming soon...</p>
        </div>
      </div>
    </div>
  );
}