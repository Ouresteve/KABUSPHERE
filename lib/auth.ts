import {supabase} from './supabase';



export const checkAllowedEmail = (email: string | undefined): boolean => {
    if(!email) return false;
    const allowedDomains= ['kabarak.ac.ke'];
    const adminAllowlist = ['steveoure96@gmail.com'];
    const normalizedEmail = email.toLowerCase();
    if (adminAllowlist.includes(normalizedEmail)) return true;
    const domain = normalizedEmail.split('@')[1];
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