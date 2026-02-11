import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { supabase } from '../utils/supabase';
import type { Session } from '@supabase/supabase-js';

export interface UserProfile {
    id: string;
    user_id: string;
    role: 'admin' | 'responsable' | 'directivo';
    display_name: string | null;
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

    // Guard against double-fetch race conditions
    const fetchingRef = useRef(false);
    const initializedRef = useRef(false);

    const fetchProfile = async (userId: string, userEmail?: string) => {
        // Prevent concurrent fetches
        if (fetchingRef.current) {
            console.log('[Auth] Skipping fetch — already in progress');
            return;
        }
        fetchingRef.current = true;

        try {
            console.log('[Auth] Fetching profile for:', userId);
            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code === 'PGRST116') {
                // Profile doesn't exist yet — create default one
                console.log('[Auth] Profile not found, creating new one...');
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
                    return;
                }

                if (newProfile) {
                    console.log('[Auth] New profile created:', newProfile);
                    setProfile(newProfile);
                }
            } else if (error) {
                console.error('[Auth] Error fetching profile:', error);
                // Retry once after a small delay (RLS recursion race)
                await new Promise(resolve => setTimeout(resolve, 500));
                const { data: retryData, error: retryError } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('user_id', userId)
                    .single();

                if (!retryError && retryData) {
                    console.log('[Auth] Profile fetched on retry:', retryData.role);
                    setProfile(retryData);
                } else {
                    console.error('[Auth] Retry also failed:', retryError);
                }
            } else {
                console.log('[Auth] Profile loaded:', data.role);
                setProfile(data);
            }
        } catch (err) {
            console.error('[Auth] Unexpected error:', err);
        } finally {
            fetchingRef.current = false;
        }
    };

    const refreshProfile = async () => {
        if (session?.user?.id) {
            fetchingRef.current = false; // Allow refresh to bypass guard
            await fetchProfile(session.user.id, session.user.email || undefined);
        }
    };

    useEffect(() => {
        // Only initialize once
        if (initializedRef.current) return;
        initializedRef.current = true;

        // Get initial session
        supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
            console.log('[Auth] Initial session:', currentSession ? 'found' : 'none');
            setSession(currentSession);
            if (currentSession?.user?.id) {
                fetchProfile(currentSession.user.id, currentSession.user.email || undefined)
                    .finally(() => setLoading(false));
            } else {
                setLoading(false);
            }
        });

        // Listen for auth changes (sign in, sign out, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, newSession) => {
                console.log('[Auth] Auth state change:', event);

                // Skip INITIAL_SESSION as we handle it above with getSession
                if (event === 'INITIAL_SESSION') return;

                setSession(newSession);

                if (event === 'SIGNED_IN' && newSession?.user?.id) {
                    fetchingRef.current = false; // Reset guard for new sign-in
                    await fetchProfile(newSession.user.id, newSession.user.email || undefined);
                    setLoading(false);
                } else if (event === 'SIGNED_OUT') {
                    setProfile(null);
                    setLoading(false);
                } else if (event === 'TOKEN_REFRESHED' && newSession?.user?.id) {
                    // On token refresh, only re-fetch if we don't have a profile
                    if (!profile) {
                        fetchingRef.current = false;
                        await fetchProfile(newSession.user.id, newSession.user.email || undefined);
                    }
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
