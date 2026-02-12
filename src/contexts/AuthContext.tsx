import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../utils/supabase';
import type { Session } from '@supabase/supabase-js';

export interface UserProfile {
    id: string;
    user_id: string;
    role: 'admin' | 'responsable' | 'directivo';
    display_name: string | null;
    phone_number: string | null;
    assigned_sectors: string[];
    sector_edit_count: number;
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

    const fetchProfile = async (userId: string, userEmail?: string): Promise<UserProfile | null> => {
        try {
            console.log('[Auth] Fetching profile for:', userId);
            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code === 'PGRST116') {
                // Profile doesn't exist yet — create default one
                console.log('[Auth] Profile not found, creating...');
                const { data: newProfile, error: insertError } = await supabase
                    .from('user_profiles')
                    .insert({
                        user_id: userId,
                        role: 'responsable',
                        display_name: userEmail || 'Usuario',
                        assigned_sectors: [],
                        sector_edit_count: 0,
                    })
                    .select()
                    .single();

                if (insertError) {
                    console.error('[Auth] Error creating profile:', insertError);
                    return null;
                }
                console.log('[Auth] Profile created:', newProfile?.role);
                return newProfile;
            } else if (error) {
                console.error('[Auth] Error fetching profile:', error);
                return null;
            } else {
                console.log('[Auth] Profile loaded:', data.role);
                return data;
            }
        } catch (err) {
            console.error('[Auth] Unexpected error:', err);
            return null;
        }
    };

    const refreshProfile = async () => {
        if (session?.user?.id) {
            const p = await fetchProfile(session.user.id, session.user.email || undefined);
            if (p) setProfile(p);
        }
    };

    useEffect(() => {
        // Use onAuthStateChange as the SOLE source of session truth.
        // It fires INITIAL_SESSION immediately for existing sessions on page load.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, currentSession) => {
                console.log('[Auth] Event:', event, currentSession ? '(session exists)' : '(no session)');

                // Synchronous state update is safe inside callback
                setSession(currentSession);

                if (currentSession?.user?.id) {
                    // CRITICAL: defer Supabase DB calls with setTimeout to avoid
                    // "AbortError: signal is aborted without reason" which happens
                    // when making Supabase requests inside the auth callback
                    const userId = currentSession.user.id;
                    const userEmail = currentSession.user.email || undefined;

                    setTimeout(async () => {
                        const p = await fetchProfile(userId, userEmail);
                        if (p) setProfile(p);
                        setLoading(false);
                    }, 0);
                } else {
                    setProfile(null);
                    setLoading(false);
                }
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const role = profile?.role || null;
    const sectors = profile?.assigned_sectors || [];

    const value: AuthContextType = {
        session,
        profile,
        loading,
        role,
        sectors,
        isAdmin: role === 'admin',
        isResponsable: role === 'responsable',
        isDirectivo: role === 'directivo',
        refreshProfile,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
