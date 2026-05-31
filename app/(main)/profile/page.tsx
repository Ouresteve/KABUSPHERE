'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { 
  Home, Users, Store, Bell, User, 
  Plus, Search, Heart, MessageCircle , LogOut, Edit3
} from 'lucide-react';

//import { User, LogOut, Edit3 } from 'lucide-react';
import {useRouter} from 'next/navigation';

interface  Profile {
    id: string;
    full_name: string;
    student_id?: string;
    course: string;
    year: string;
    hostel_address: string;
    avatar_url?: string | null;
    created_at?: string;
}
export default function ProfilePage() {
    const [activeTab, setActiveTab] = useState('profile');
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const route = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user){
       // route.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error(error);
      }

      if (data) {
        setProfile(data);
      } else {
        // Create default profile if none exists
        const newProfile = {
          id: user.id,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
        

          hostel_address: '',
          course: '',
          year: '',
        };

        await supabase.from('profiles').insert(newProfile);
        setProfile(newProfile);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  if (loading) {
    return <div className="p-8 text-center">Loading profile...</div>;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#001533] to-[#0047B3] px-6 pt-12 pb-8 text-white">
        <div className="flex flex-col items-center">
          <div className="w-28 h-28 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-4 border-4 border-white/30">
            {profile?.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt="User Avatar" 
                
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User className="w-16 h-16" />
            )}
          </div>
          <h2 className="text-2xl font-bold">{profile?.full_name}</h2>
          <p className="text-blue-200 mt-1">{user?.email}</p>
        </div>
      </div>

      <div className="px-6 -mt-6">
        <div className="bg-white rounded-3xl shadow p-6 space-y-6">
          
          
          
      

          <div>
            <label className="text-sm text-gray-500 font-bold block mb-1">Hostel Address</label>
            <p className="font-medium text-[#0047B3]">{profile?.hostel_address || 'Not set yet'}</p>
          </div>

          <div>
            <label className="text-sm text-[#001533]  font-bold block mb-1">Course</label>
            <p className="font-medium text-[#0047B3]">{profile?.course || 'Not set yet'}</p>
          </div>

          <div>
            <label className="text-black font-bold  block mb-1">Year of Study</label>
            <p className="font-medium text-[#0047B3]">{profile?.year || 'Not set yet'}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 space-y-3">
          <button 
          onClick={() => route.push('/onboarding')}
          className="w-full bg-white border border-gray-200 hover:bg-gray-50 transition py-4 rounded-2xl font-medium  text-black flex items-center justify-center gap-3">
            <Edit3 className="w-5 h-5" />
            Edit Profile
          </button>

          <button 
            onClick={signOut}
            className="w-full bg-red-50 text-red-600 hover:bg-red-100 transition py-4 rounded-2xl font-medium flex items-center justify-center gap-3"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </div>
     
      {/*navigation*/}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t py-2 px-4 z-50">
        <div className="flex justify-around items-center max-w-md mx-auto">
          {[
            { icon: Home, label: 'Home', tab: 'feed' },
            { icon: Store, label: 'Market', tab: 'market' },
            { icon: Users, label: 'Campus', tab: 'campus' },
            { icon: User, label: 'Profile', tab: 'profile' },
          ].map((item) => (
            <button
              key={item.tab}
              onClick={() => setActiveTab(item.tab)}
              className={`flex flex-col items-center py-1 px-4 transition ${activeTab === item.tab ? 'text-[#0047B3]' : 'text-gray-500'}`}
            >
              <item.icon className="w-6 h-6" />
              <span className="text-[10px] mt-1 font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}