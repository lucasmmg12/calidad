import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
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

    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code === 'PGRST116') {
                // Profile doesn't exist yet — create default one
                const { data: newProfile, error: insertError } = await supabase
                    .from('user_profiles')
                    .insert({
                        user_id: userId,
                        role: 'responsable',
                        display_name: session?.user?.email || null,
                        assigned_sectors: [],
                        sector_edit_count: 0,
                    })
                    .select()
                    .single();

                if (insertError) {
                    console.error('[Auth] Error creating profile:', insertError);
                    return;
                }
                setProfile(newProfile);
            } else if (error) {
                console.error('[Auth] Error fetching profile:', error);
            } else {
                setProfile(data);
            }
        } catch (err) {
            console.error('[Auth] Unexpected error:', err);
        }
    };

    const refreshProfile = async () => {
        if (session?.user?.id) {
            await fetchProfile(session.user.id);
        }
    };

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
            setSession(currentSession);
            if (currentSession?.user?.id) {
                fetchProfile(currentSession.user.id).finally(() => setLoading(false));
            } else {
                setLoading(false);
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, newSession) => {
                setSession(newSession);
                if (newSession?.user?.id) {
                    await fetchProfile(newSession.user.id);
                } else {
                    setProfile(null);
                }
                setLoading(false);
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
