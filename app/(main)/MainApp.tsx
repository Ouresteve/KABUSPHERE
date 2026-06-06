'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import HomePage from './home/page';
import MarketPage from './market/page';
import CampusPage from './campus/page';
import ProfilePage from './profile/page';
import CreatePostPage from './create/page';
import OnboardingPage from './onboarding/page';
import ServicesPage from './services/page';



import { 
  Home, Users, Store, Bell, User, Plus, Search, Heart, 
  MessageCircle, Share2, Eye
} from 'lucide-react';

export default function MainApp() {
  const pathname = usePathname();
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
      {renderPage()}

      {/* Bottom Navigation - Hide on Create Post Page */}
      {!pathname.includes('/create') && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t py-2 px-4 z-50">
          <div className="flex justify-around items-center max-w-md mx-auto">
            {[
              { icon: Home, label: 'Home', tab: 'home' },
              { icon: Store, label: 'Market', tab: 'market' },
              { icon: Users, label: 'Services', tab: 'services' },
              { icon: User, label: 'Profile', tab: 'profile' },
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
          </div>
        </div>
      )}
    </>
  );
}