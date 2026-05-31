import { ReactNode } from 'react';
export default function AuthLayout({ children }: { children: ReactNode }) {
    return (
        <div className= "min-h-screen bg-gradient-to-br from-[#0F766E] to-[#1E40AF] flex items-center justify-center p-4">
            <div className = "w-full max-w-md">
                {children}
            </div>
        </div>
    );
}