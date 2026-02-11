-- =====================================================
-- Migration: User Profiles, Roles & Classification (FIXED)
-- Date: 2026-02-11
-- Description: Fixes infinite recursion in RLS policies causing 500 errors
-- =====================================================

-- 0. Helper function to prevent recursion in Admin policies
-- This function runs with SECURITY DEFINER to bypass RLS when checking admin status
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Create user_profiles table if not exists
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

-- 3. Drop existing policies to prevent conflicts/recursion
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Authenticated users can insert own profile" ON public.user_profiles;

-- 4. Re-create Optimized RLS Policies
-- Users can read their own profile
CREATE POLICY "Users can read own profile"
    ON public.user_profiles FOR SELECT
    USING (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON public.user_profiles FOR UPDATE
    USING (auth.uid() = user_id);

-- Admins can read all profiles (Using non-recursive function)
CREATE POLICY "Admins can read all profiles"
    ON public.user_profiles FOR SELECT
    USING (public.is_admin());

-- Admins can update all profiles
CREATE POLICY "Admins can update all profiles"
    ON public.user_profiles FOR UPDATE
    USING (public.is_admin());

-- Allow insert for authenticated users (auto-create profile on first login)
CREATE POLICY "Authenticated users can insert own profile"
    ON public.user_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 5. Update reports status constraint logic
DO $$ 
BEGIN
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
            'assignment_rejected',
            'discarded' 
        ));
EXCEPTION
    WHEN OTHERS THEN NULL; -- Ignore if table doesn't exist yet
END $$;

-- 6. Auto-create user profile trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.user_profiles (user_id, role, display_name)
    VALUES (NEW.id, 'responsable', COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email))
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
