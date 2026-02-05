-- Add immediate_action column to reports table
DO $$ 
BEGIN 
    ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS immediate_action text;
EXCEPTION
    WHEN others THEN NULL;
END $$;
