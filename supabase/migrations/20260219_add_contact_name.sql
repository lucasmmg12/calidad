-- ============================================================
-- Migration: Add contact_name to reports
-- Description: Adds a contact_name column to the reports table
--              to store the reporter's name when they choose to
--              identify themselves.
-- ============================================================

SET search_path TO public;

-- Add contact_name column if not exists
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS contact_name TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.reports.contact_name IS 'Reporter name when not anonymous. NULL when anonymous.';
