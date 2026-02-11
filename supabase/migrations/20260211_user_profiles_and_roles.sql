-- =====================================================
-- Migration: User Profiles, Roles & Classification
-- Date: 2026-02-11
-- =====================================================

-- 1. Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    role text NOT NULL DEFAULT 'responsable' CHECK (role IN ('admin', 'responsable', 'directivo')),
    display_name text,
    assigned_sectors text[] DEFAULT '{}',
    sector_edit_count integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Users can read their own profile
CREATE POLICY "Users can read own profile"
    ON public.user_profiles FOR SELECT
    USING (auth.uid() = user_id);

-- Users can update their own profile (sectors, display_name)
CREATE POLICY "Users can update own profile"
    ON public.user_profiles FOR UPDATE
    USING (auth.uid() = user_id);

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
    ON public.user_profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can update all profiles (role changes, etc.)
CREATE POLICY "Admins can update all profiles"
    ON public.user_profiles FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Allow insert for authenticated users (auto-create profile on first login)
CREATE POLICY "Authenticated users can insert own profile"
    ON public.user_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 4. Update reports status constraint to include 'assignment_rejected'
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_status_check;
ALTER TABLE public.reports ADD CONSTRAINT reports_status_check
    CHECK (status IN (
        'pending',
        'analyzed',
        'in_progress',
        'pending_resolution',
        'quality_validation',
        'resolved',
        'cancelled',
        'assignment_rejected'
    ));

-- 5. Auto-create user profile trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.user_profiles (user_id, role, display_name)
    VALUES (NEW.id, 'responsable', COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
