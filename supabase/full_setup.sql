-- 1. Create Reports Table (Idempotent)
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tracking_id text NOT NULL UNIQUE,
  content text NOT NULL,
  sector text,
  is_anonymous boolean DEFAULT true,
  contact_number text,
  media_url text, -- For uploaded image URL (legacy/single)
  
  -- AI Analysis Fields
  ai_summary text,
  ai_category text,
  ai_urgency text CHECK (ai_urgency IN ('Verde', 'Amarillo', 'Rojo')),
  ai_consequences text,
  ai_solutions text,
  
  -- Resolution & Status Fields
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'analyzed', 'pending_resolution', 'in_progress', 'resolved')),
  evidence_urls text[],           -- Multiple images for the initial report
  resolution_notes text,          -- Notes added upon resolution (Immediate Action)
  root_cause text,                -- Root Cause Analysis
  corrective_plan text,           -- Long term plan
  implementation_date date,       -- Implementation deadline
  resolution_evidence_urls text[],-- Images added upon resolution
  resolved_at timestamp with time zone,
  assigned_to text,               -- Person responsible
    is_adverse_event boolean,       -- Flag for RCA requirement
  last_whatsapp_status text,      -- 'sent' or 'failed'
  last_whatsapp_sent_at timestamp with time zone,
  notes text,                     -- Internal administrative notes
  
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure all columns exist (in case table existed but new columns didn't)
DO $$ 
BEGIN 
    ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS ai_consequences text;
    ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS ai_solutions text;
    ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS evidence_urls text[];
    ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS resolution_notes text;
    ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS root_cause text;
    ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS corrective_plan text;
    ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS implementation_date date;
    ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS resolution_evidence_urls text[];
    ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS resolved_at timestamp with time zone;
    ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS assigned_to text;
    ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS is_adverse_event boolean;
    ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS last_whatsapp_status text;
    ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS last_whatsapp_sent_at timestamp with time zone;
    ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS notes text;
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies (Drop first to avoid "already exists" error)

-- Policy: Allow anyone to insert (public form)
DROP POLICY IF EXISTS "Enable insert for all users" ON public.reports;
CREATE POLICY "Enable insert for all users" ON public.reports FOR INSERT WITH CHECK (true);

-- Policy: Allow users to view reports
DROP POLICY IF EXISTS "Enable select for all users" ON public.reports;
CREATE POLICY "Enable select for all users" ON public.reports FOR SELECT USING (true);
-- Note: Check if "Enable select by tracking_id" exists from previous attempts and drop it if you want to consolidate
DROP POLICY IF EXISTS "Enable select by tracking_id" ON public.reports;

-- Policy: Allow users to update reports
DROP POLICY IF EXISTS "Enable update for all users" ON public.reports;
CREATE POLICY "Enable update for all users" ON public.reports FOR UPDATE USING (true);

-- Policy: Allow users to delete reports
DROP POLICY IF EXISTS "Enable delete for all users" ON public.reports;
CREATE POLICY "Enable delete for all users" ON public.reports FOR DELETE USING (true);

-- 4. Create Storage Bucket for Evidence
INSERT INTO storage.buckets (id, name, public) 
VALUES ('evidence', 'evidence', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage Policies
-- Allow public access to read evidence
DROP POLICY IF EXISTS "Public Access Evidence" ON storage.objects;
CREATE POLICY "Public Access Evidence" ON storage.objects 
  FOR SELECT USING ( bucket_id = 'evidence' );

-- Allow public upload to evidence bucket
DROP POLICY IF EXISTS "Public Upload Evidence" ON storage.objects;
CREATE POLICY "Public Upload Evidence" ON storage.objects 
  FOR INSERT WITH CHECK ( bucket_id = 'evidence' );

-- 6. Update Status Constraint (Fix for 'pending_resolution')
DO $$
BEGIN
    ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_status_check;
    ALTER TABLE public.reports ADD CONSTRAINT reports_status_check 
    CHECK (status IN ('pending', 'analyzed', 'pending_resolution', 'in_progress', 'resolved'));
EXCEPTION
    WHEN others THEN NULL;
END $$;
