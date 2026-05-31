'use client';

import { AuthProvider } from '@/lib/auth-context';
import MainApp from './MainApp';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <MainApp/>
    </AuthProvider>
  );
}