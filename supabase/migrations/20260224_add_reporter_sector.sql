-- Add reporter_sector column to store which sector the reporter belongs to (always mandatory)
ALTER TABLE reports ADD COLUMN IF NOT EXISTS reporter_sector TEXT;
