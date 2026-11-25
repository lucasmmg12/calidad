import { createContext, useContext, useEffect, useState, useRef, useMemo, useCallback, type ReactNode } from 'react';
import { supabase } from '../utils/supabase';
import type { Session } from '@supabase/supabase-js';

const EMPTY_SECTORS: string[] = [];

export interface UserProfile {
    id: string;
    user_id: string;
    role: 'admin' | 'responsable' | 'directivo';
    display_name: string | null;
    phone_number: string | null;
    assigned_sectors: string[];
    sector_edit_count: number;
    onboarding_completed: boolean;
    account_status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    updated_at: string;
}

interface AuthContextType {
    session: Session | null;
    profile: UserProfile | null;
    loading: boolean;
    role: string | null;
    sectors: string[];
    isAdmin: boolean;
    isResponsable: boolean;
    isDirectivo: boolean;
    isApproved: boolean;
    isPending: boolean;
    needsOnboarding: boolean;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    profile: null,
    loading: true,
    role: null,
    sectors: [],
    isAdmin: false,
    isResponsable: false,
    isDirectivo: false,
    isApproved: false,
    isPending: true,
    needsOnboarding: true,
    refreshProfile: async () => { },
});

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const lastFetchedUserIdRef = useRef<string | null>(null);

    const fetchProfile = useCallback(async (userId: string, userEmail?: string): Promise<UserProfile | null> => {
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code === 'PGRST116') {
                const { data: newProfile, error: insertError } = await supabase
                    .from('user_profiles')
                    .insert({
                        user_id: userId,
                        role: 'responsable',
                        display_name: userEmail || 'Usuario',
                        assigned_sectors: [],
                        sector_edit_count: 0,
                        onboarding_completed: false,
                        account_status: 'pending',
                    })
                    .select()
                    .single();

                if (insertError) {
                    console.error('[Auth] Error creating profile:', insertError);
                    return null;
                }
                return newProfile;
            } else if (error) {
                console.error('[Auth] Error fetching profile:', error);
                return null;
            } else {
                return data;
            }
        } catch (err) {
            console.error('[Auth] Unexpected error:', err);
            return null;
        }
    }, []);

    const refreshProfile = useCallback(async () => {
        if (session?.user?.id) {
            const p = await fetchProfile(session.user.id, session.user.email || undefined);
            if (p) setProfile(p);
        }
    }, [session?.user?.id, session?.user?.email, fetchProfile]);

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, currentSession) => {
                setSession(currentSession);

                if (currentSession?.user?.id) {
                    const userId = currentSession.user.id;
                    const userEmail = currentSession.user.email || undefined;

                    // Avoid re-fetching profile on TOKEN_REFRESHED when user hasn't changed
                    if (event === 'TOKEN_REFRESHED' && lastFetchedUserIdRef.current === userId) {
                        return;
                    }

                    lastFetchedUserIdRef.current = userId;
                    setTimeout(async () => {
                        const p = await fetchProfile(userId, userEmail);
                        if (p) setProfile(p);
                        setLoading(false);
                    }, 0);
                } else {
                    lastFetchedUserIdRef.current = null;
                    setProfile(null);
                    setLoading(false);
                }
            }
        );

        return () => subscription.unsubscribe();
    }, [fetchProfile]);

    const role = profile?.role || null;
    const sectorsKey = profile?.assigned_sectors ? profile.assigned_sectors.join('|') : '';
    const sectors = useMemo(
        () => (profile?.assigned_sectors && profile.assigned_sectors.length > 0 ? profile.assigned_sectors : EMPTY_SECTORS),
        [sectorsKey]
    );

    const isApproved = profile?.account_status === 'approved';
    const isPending = profile?.account_status === 'pending';
    const needsOnboarding = profile?.onboarding_completed === false;

    const value: AuthContextType = useMemo(() => ({
        session,
        profile,
        loading,
        role,
        sectors,
        isAdmin: role === 'admin',
        isResponsable: role === 'responsable',
        isDirectivo: role === 'directivo',
        isApproved,
        isPending,
        needsOnboarding,
        refreshProfile,
    }), [session, profile, loading, role, sectors, isApproved, isPending, needsOnboarding, refreshProfile]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
