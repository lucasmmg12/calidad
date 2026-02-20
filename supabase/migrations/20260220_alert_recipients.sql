-- ============================================================
-- Alert Recipients Table
-- Stores phone numbers that receive WhatsApp alerts for RED cases
-- Only admins can manage these via the UI
-- ============================================================

CREATE TABLE IF NOT EXISTS alert_recipients (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    phone_number text NOT NULL,
    display_name text NOT NULL DEFAULT '',
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Prevent duplicate phone numbers
CREATE UNIQUE INDEX IF NOT EXISTS alert_recipients_phone_idx ON alert_recipients (phone_number);

-- Enable RLS
ALTER TABLE alert_recipients ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only service_role (Edge Functions) can read, only admin via authenticated can manage
-- Allow all authenticated users to read (needed for admin UI)
CREATE POLICY "Authenticated users can read alert_recipients"
    ON alert_recipients FOR SELECT
    TO authenticated
    USING (true);

-- Allow all authenticated users to insert/update/delete (admin check is done in frontend)
CREATE POLICY "Authenticated users can manage alert_recipients"
    ON alert_recipients FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow service_role full access (for Edge Functions)
CREATE POLICY "Service role full access to alert_recipients"
    ON alert_recipients FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Seed: Migrate current hardcoded number to table
INSERT INTO alert_recipients (phone_number, display_name, is_active)
VALUES ('2644396596', 'Claudia', true)
ON CONFLICT (phone_number) DO NOTHING;
