-- =====================================================
-- WhatsApp Chat System — Messages & Shortcuts
-- Enables bidirectional chat via BuilderBot webhook
-- =====================================================

-- 1. Messages table
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone_number TEXT NOT NULL,           -- normalized phone without 549 prefix (e.g. 2644153676)
    direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
    message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'audio', 'video', 'document', 'sticker')),
    body TEXT,                            -- text content
    media_url TEXT,                       -- URL of attached media (stored in Storage or external)
    media_mime_type TEXT,                 -- MIME type of attachment
    attachment_filename TEXT,             -- original filename for documents
    sender_name TEXT,                     -- display name of internal sender or WhatsApp contact name
    contact_name TEXT,                    -- name of the WhatsApp contact (from BuilderBot payload)
    report_tracking_id TEXT,             -- optional link to a report
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb    -- extra data from BuilderBot payload
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_wa_messages_phone ON whatsapp_messages (phone_number);
CREATE INDEX IF NOT EXISTS idx_wa_messages_created ON whatsapp_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_messages_phone_created ON whatsapp_messages (phone_number, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_messages_unread ON whatsapp_messages (phone_number, is_read) WHERE is_read = false;

-- 2. Shortcuts table (message templates)
CREATE TABLE IF NOT EXISTS whatsapp_shortcuts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shortcut_key TEXT NOT NULL UNIQUE,   -- e.g. "saludo", "turno", "info"
    title TEXT NOT NULL,                 -- human-readable name
    content TEXT NOT NULL,               -- template message
    category TEXT DEFAULT 'general',     -- grouping category
    created_by TEXT,                     -- user who created it
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable Realtime on messages table
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_messages;

-- 4. RLS Policies
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_shortcuts ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access (internal staff only)
CREATE POLICY "Authenticated users can read messages"
    ON whatsapp_messages FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert messages"
    ON whatsapp_messages FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update messages"
    ON whatsapp_messages FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Service role (Edge Functions) can do everything
CREATE POLICY "Service role full access messages"
    ON whatsapp_messages FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users manage shortcuts"
    ON whatsapp_shortcuts FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 5. Insert default shortcuts
INSERT INTO whatsapp_shortcuts (shortcut_key, title, content, category) VALUES
    ('saludo', 'Saludo inicial', '👋 ¡Hola! Soy del equipo de Calidad del Sanatorio Argentino. ¿En qué puedo ayudarte?', 'general'),
    ('seguimiento', 'Seguimiento de caso', '📋 Nos comunicamos para dar seguimiento a su caso. ¿Podría brindarnos más información?', 'seguimiento'),
    ('gracias', 'Agradecimiento', '🙏 ¡Muchas gracias por su colaboración! Su aporte nos ayuda a mejorar continuamente.', 'general'),
    ('resuelto', 'Caso resuelto', '✅ Le informamos que su caso ha sido resuelto satisfactoriamente. ¡Gracias por reportarlo!', 'cierre'),
    ('info', 'Solicitar info', '📝 Para poder gestionar su caso, necesitamos que nos brinde la siguiente información adicional:', 'seguimiento')
ON CONFLICT (shortcut_key) DO NOTHING;

-- 6. Storage bucket for WhatsApp media
-- NOTE: Run this manually in Supabase Dashboard → Storage → Create bucket "whatsapp-media" (public)
