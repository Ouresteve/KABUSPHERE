'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';  
import {User } from '@supabase/supabase-js';

type AuthContextType = {
    user: User | null ;
    loading: boolean;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({children }: {children: React.ReactNode}) {
    const [user, setUser] = useState<User | null>(null);
    const [loading,setLoading] = useState(true);

    useEffect(()=> {
        const getSession = async ()=> {
            const {data: {session} } = await supabase.auth.getSession();
            setUser(session?.user ?? null);
            setLoading(false);
        };

        getSession();

        const {data: {subscription}} = supabase.auth.onAuthStateChange(
            (_event, session)=> {
                setUser(session?.user ?? null);
                setLoading(false);
            }
        );
        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
        window.location.href='/login';
    };

    return (
        <AuthContext.Provider value={{user, loading, signOut}}>
            {children}
        </AuthContext.Provider>
    );


}


export const useAuth = () => {
    const context = useContext( AuthContext);
    if(context===undefined) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};