import {supabase} from './supabase';



export const checkAllowedEmail = (email: string | undefined): boolean => {
    if(!email) return false;
    const allowedDomains= ['kabarak.ac.ke'];
    const domain = email.split('@')[1]?.toLowerCase();
    return allowedDomains.includes(domain || '');

};

export const enforceEmailRestriction  = async () => {
    const {data: {session} } = await supabase.auth.getSession();

    if(session?.user?.email) {
        if(!checkAllowedEmail(session.user.email)) {
            await supabase.auth.signOut();
            return {
                allowed: false, email:session.user.email
            };
        }
    }
    return { allowed: true};
};