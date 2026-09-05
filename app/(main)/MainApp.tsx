'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import HomePage from './home/page';
import MarketPage from './market/page';
import ListProductPage from './market/list/page';
import ManageListingsPage from './market/manage/page';
import CampusPage from './campus/page';
import ProfilePage from './profile/page';
import CreatePostPage from './create/page';
import OnboardingPage from './onboarding/page';
import ServicesPage from './services/page';
import AdminPage from './admin/page';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';



import { Home, Users, Store, User, Plus } from 'lucide-react';

export default function MainApp() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'home' | 'market' | 'campus' | 'profile' | 'services'>('home');

    // Register Service Worker for PWA + Push Notifications
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered successfully');
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []);

  useEffect(() => {
    if (!pathname || pathname.includes('/admin') || !user) return;
    const updatePresence = () => {
      supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', user.id).then(() => undefined);
    };
    updatePresence();
    const interval = window.setInterval(updatePresence, 60_000);
    return () => window.clearInterval(interval);
  }, [pathname, user]);
  // Update active tab based on URL
  useEffect(() => {
    if (pathname?.includes('/market')) setActiveTab('market');
    else if (pathname?.includes('/campus')) setActiveTab('campus');
    else if (pathname?.includes('/services')) setActiveTab('services');
    else if (pathname?.includes('/profile')) setActiveTab('profile');
    else if (pathname?.includes('/home')) setActiveTab('home');

    else if (pathname?.includes('/create')) return;
    else if (pathname?.includes('/onboarding')) return;
    else setActiveTab('home');
  }, [pathname]);
  const renderPage = () => {
    if (pathname.includes('/create')){
    
        return <CreatePostPage />;
    }
      if (pathname.includes('/admin')) {
        return <AdminPage />;
      }
      if (pathname.includes('/market/manage')) {
        return <ManageListingsPage />;
      }
      if (pathname.includes('/market/list')) {
        return <ListProductPage />;
      }
    if (pathname.includes('/onboarding')){
        return <OnboardingPage/>;
    }
    if (pathname.includes('/market')) {
        //setActiveTab('market');
        return <MarketPage />;
    }
    if (pathname.includes('/services')) {
         return <ServicesPage />;
    }
    if (pathname.includes('/profile')) return <ProfilePage />;
    return <HomePage />;
  };

  return (
    <>
      <div className={!pathname.includes('/create') && !pathname.includes('/onboarding') && !pathname.includes('/market/list') && !pathname.includes('/market/manage') ? 'lg:pl-64' : ''}>
        {renderPage()}
      </div>

      {/* Desktop Navigation */}
      {!pathname.includes('/create') && !pathname.includes('/onboarding') && !pathname.includes('/market/list') && !pathname.includes('/market/manage') && (
        <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 border-r border-gray-200 bg-white lg:block">
          <div className="flex h-full flex-col px-5 py-8">
            <div className="mb-10 px-3">
              <p className="text-xl font-bold tracking-tight text-[#001533]">
                KABU<span className="text-[#0047B3]">SPHERE</span>
              </p>
              <p className="mt-1 text-xs text-gray-500">Campus community</p>
            </div>
            <nav className="space-y-2" aria-label="Main navigation">
              {[
                { icon: Store, label: 'Market', tab: 'market' },
                { icon: Home, label: 'Feed', tab: 'home' },
                { icon: Users, label: 'Services', tab: 'services' },
                { icon: User, label: 'Profile', tab: 'profile' },
              ].map((item) => (
                <button
                  key={item.tab}
                  onClick={() => window.location.href = `/${item.tab}`}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition ${activeTab === item.tab ? 'bg-blue-50 font-semibold text-[#0047B3]' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </aside>
      )}

      {/* Bottom Navigation - Hide on Create Post Page */}
      {!pathname.includes('/create') && !pathname.includes('/onboarding') && !pathname.includes('/market/list') && !pathname.includes('/market/manage') && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white px-4 py-2 lg:hidden">
          <div className="mx-auto grid max-w-md grid-cols-5 items-end">
            {[
              { icon: Store, label: 'Market', tab: 'market' },
              { icon: Home, label: 'Feed', tab: 'home' },
            ].map((item) => (
              <button
                key={item.tab}
                onClick={() => window.location.href = `/${item.tab}`}
                className={`flex flex-col items-center py-1 px-4 transition ${activeTab === item.tab ? 'text-[#0047B3]' : 'text-gray-500'}`}
              >
                <item.icon className="w-6 h-6" />
                <span className="text-xs mt-1 font-medium">{item.label}</span>
              </button>
            ))}
            <button onClick={() => window.location.href = pathname.includes('/market') ? '/market/list' : '/create'} className="-mt-7 flex flex-col items-center justify-center gap-1 text-[#0047B3]" aria-label={pathname.includes('/market') ? 'List an item' : 'Create a post'}>
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0047B3] text-white shadow-lg ring-4 ring-white"><Plus className="h-7 w-7" /></span>
              <span className="text-[10px] font-semibold">{pathname.includes('/market') ? 'Sell' : 'Post'}</span>
            </button>
            {[
              { icon: Users, label: 'Services', tab: 'services' },
              { icon: User, label: 'Profile', tab: 'profile' },
            ].map((item) => (
              <button
                key={item.tab}
                onClick={() => window.location.href = `/${item.tab}`}
                className={`flex flex-col items-center py-1 px-2 transition ${activeTab === item.tab ? 'text-[#0047B3]' : 'text-gray-500'}`}
              >
                <item.icon className="w-6 h-6" />
                <span className="text-xs mt-1 font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}