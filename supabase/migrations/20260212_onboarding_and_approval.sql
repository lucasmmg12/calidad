-- =====================================================
-- Migration: Onboarding & Account Approval Workflow
-- Date: 2026-02-12
-- Description: Users self-register, complete onboarding,
--              then wait for Calidad admin approval.
-- =====================================================

-- 1. Add onboarding_completed flag
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_profiles' AND column_name = 'onboarding_completed'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN onboarding_completed BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 2. Add account_status: pending | approved | rejected
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_profiles' AND column_name = 'account_status'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN account_status TEXT DEFAULT 'pending';
    END IF;
END $$;

-- 3. Set existing users as approved (they were already using the system)
UPDATE public.user_profiles
SET account_status = 'approved',
    onboarding_completed = true
WHERE account_status IS NULL OR account_status = 'pending';

-- 4. Index for quick filtering of pending approvals
CREATE INDEX IF NOT EXISTS idx_user_profiles_account_status ON public.user_profiles(account_status);
