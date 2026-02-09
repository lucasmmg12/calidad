-- Add resolution_history JSONB column to reports table
ALTER TABLE reports
ADD COLUMN IF NOT EXISTS resolution_history JSONB DEFAULT '[]'::JSONB;
