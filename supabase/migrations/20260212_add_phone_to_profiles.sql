-- =====================================================
-- Migration: Add phone_number to user_profiles
-- Date: 2026-02-12
-- Description: Adds phone_number field for WhatsApp notifications.
--              Responsables must fill this in their profile.
--              Admins can then select responsables by name instead
--              of manually typing phone numbers.
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_profiles' AND column_name = 'phone_number'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN phone_number TEXT;
    END IF;
END $$;

-- Index for quick lookups when listing responsables
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
