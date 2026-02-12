-- ============================================================
-- 🚨 MASTER MIGRATION: Run this ONCE in Supabase SQL Editor
-- 🚨 This consolidates ALL pending migrations
-- Date: 2026-02-12
-- ============================================================

-- ============ 1. REPORTS TABLE: Missing columns ============

-- 1a. immediate_action
DO $$
BEGIN
    ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS immediate_action TEXT;
EXCEPTION WHEN others THEN NULL;
END $$;

-- 1b. origin_sector
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'reports' AND column_name = 'origin_sector'
    ) THEN
        ALTER TABLE public.reports ADD COLUMN origin_sector TEXT;
    END IF;
END $$;

-- 1c. resolution_history
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS resolution_history JSONB DEFAULT '[]'::JSONB;

-- 1d. corrective_action_plan (used by PDCA follow-ups)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'reports' AND column_name = 'corrective_action_plan'
    ) THEN
        ALTER TABLE public.reports ADD COLUMN corrective_action_plan TEXT;
    END IF;
END $$;

-- 1e. SLA tracking columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'sla_deadline') THEN
        ALTER TABLE public.reports ADD COLUMN sla_deadline TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'sla_status') THEN
        ALTER TABLE public.reports ADD COLUMN sla_status TEXT DEFAULT 'on_time';
    END IF;
END $$;


-- ============ 2. FOLLOW-UPS TABLE ============

CREATE TABLE IF NOT EXISTS public.follow_ups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    checkpoint_type TEXT NOT NULL CHECK (checkpoint_type IN ('30d', '60d', '90d')),
    due_date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue', 'skipped')),
    verification_result TEXT CHECK (verification_result IN ('effective', 'partial', 'ineffective')),
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_follow_ups_report_id ON public.follow_ups(report_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_status ON public.follow_ups(status);
CREATE INDEX IF NOT EXISTS idx_follow_ups_due_date ON public.follow_ups(due_date);

-- RLS for follow_ups
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'follow_ups' AND policyname = 'Authenticated users can read follow_ups') THEN
        CREATE POLICY "Authenticated users can read follow_ups"
            ON public.follow_ups FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'follow_ups' AND policyname = 'Authenticated users can insert follow_ups') THEN
        CREATE POLICY "Authenticated users can insert follow_ups"
            ON public.follow_ups FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'follow_ups' AND policyname = 'Authenticated users can update follow_ups') THEN
        CREATE POLICY "Authenticated users can update follow_ups"
            ON public.follow_ups FOR UPDATE TO authenticated USING (true);
    END IF;
END $$;

-- Trigger: Auto-create follow-ups when report is resolved
CREATE OR REPLACE FUNCTION create_follow_ups_on_resolve()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'resolved' AND (OLD.status IS NULL OR OLD.status != 'resolved') THEN
        INSERT INTO public.follow_ups (report_id, checkpoint_type, due_date) VALUES
            (NEW.id, '30d', NOW() + INTERVAL '30 days'),
            (NEW.id, '60d', NOW() + INTERVAL '60 days'),
            (NEW.id, '90d', NOW() + INTERVAL '90 days');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_follow_ups ON public.reports;
CREATE TRIGGER trigger_create_follow_ups
    AFTER UPDATE ON public.reports
    FOR EACH ROW
    EXECUTE FUNCTION create_follow_ups_on_resolve();


-- ============ 3. USER PROFILES: Missing columns ============

-- 3a. phone_number
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_profiles' AND column_name = 'phone_number'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN phone_number TEXT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);

-- 3b. onboarding_completed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_profiles' AND column_name = 'onboarding_completed'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN onboarding_completed BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 3c. account_status
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_profiles' AND column_name = 'account_status'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN account_status TEXT DEFAULT 'pending';
    END IF;
END $$;

-- 3d. Set ALL existing users as approved (they were already using the system)
UPDATE public.user_profiles
SET account_status = 'approved',
    onboarding_completed = true
WHERE account_status IS NULL OR account_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_user_profiles_account_status ON public.user_profiles(account_status);

-- 3e. RLS: Allow users to delete profiles (for admin user management)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'Authenticated users can delete user_profiles') THEN
        CREATE POLICY "Authenticated users can delete user_profiles"
            ON public.user_profiles FOR DELETE TO authenticated USING (true);
    END IF;
END $$;


-- ============================================================
-- ✅ DONE! All migrations applied successfully.
-- ============================================================
