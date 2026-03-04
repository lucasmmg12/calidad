import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const payload = await req.json();
        console.log('[Webhook] Received:', JSON.stringify(payload));

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const eventName = payload.eventName;
        const data = payload.data;

        if (!data || !eventName) {
            return new Response(JSON.stringify({ error: 'Invalid payload' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            });
        }

        // Normalize phone: remove 549 prefix for storage
        const rawPhone = data.from || '';
        const normalizedPhone = rawPhone.replace(/^549/, '').replace(/\D/g, '');

        if (!normalizedPhone) {
            return new Response(JSON.stringify({ error: 'No phone number' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            });
        }

        // At this point, only incoming messages proceed
        const direction = 'incoming';
        let body = '';
        let mediaUrl = '';
        let messageType = 'text';
        let contactName = '';

        if (eventName === 'message.incoming') {
            body = data.body || '';
            contactName = data.name || data.pushName || '';

            // BuilderBot media: the real URL is in urlTempFile, not in attachment (which is just filename)
            const tempFileUrl = data.urlTempFile || '';
            const attachmentFilename = (data.attachment && Array.isArray(data.attachment) && data.attachment.length > 0)
                ? data.attachment[0]
                : '';

            // Detect if this is a media message
            if (tempFileUrl || body.startsWith('_event_media__')) {
                mediaUrl = tempFileUrl;

                // Detect type from filename or URL
                const detectFrom = attachmentFilename || tempFileUrl || '';
                if (detectFrom.match(/\.(jpg|jpeg|png|gif|webp)/i)) {
                    messageType = 'image';
                } else if (detectFrom.match(/\.(mp4|mov|avi|webm|3gp)/i)) {
                    messageType = 'video';
                } else if (detectFrom.match(/\.(ogg|opus|mp3|m4a|wav|amr)/i)) {
                    messageType = 'audio';
                } else if (detectFrom.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx)/i)) {
                    messageType = 'document';
                } else if (detectFrom.match(/\.(webp|sticker)/i)) {
                    messageType = 'sticker';
                } else {
                    messageType = 'image'; // default for unknown media
                }

                // Clean up body for media messages
                if (body.startsWith('_event_media__')) {
                    body = ''; // remove the internal reference
                }
            }
        } else if (eventName === 'message.outgoing') {
            // SKIP outgoing — we already save outgoing messages via chatService.sendTextMessage
            // Inserting here would cause duplicate messages in the chat.
            console.log('[Webhook] Skipping outgoing (handled by chatService):', normalizedPhone);
            return new Response(JSON.stringify({ ok: true, skipped: 'outgoing' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        } else if (eventName === 'message.calling') {
            // Skip call events
            return new Response(JSON.stringify({ ok: true, skipped: 'calling' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        } else {
            // Unknown event
            console.log('[Webhook] Unknown event:', eventName);
            return new Response(JSON.stringify({ ok: true, skipped: eventName }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        // Insert message into DB
        const { data: inserted, error: insertError } = await supabase
            .from('whatsapp_messages')
            .insert({
                phone_number: normalizedPhone,
                direction,
                message_type: messageType,
                body: body || null,
                media_url: mediaUrl || null,
                contact_name: contactName || null,
                sender_name: contactName || null,
                is_read: false,
                metadata: {
                    eventName,
                    projectId: data.projectId,
                    raw: data,
                },
            })
            .select()
            .single();

        if (insertError) {
            console.error('[Webhook] DB Insert Error:', insertError);
            throw insertError;
        }

        console.log('[Webhook] Message saved:', inserted.id, direction, normalizedPhone);

        return new Response(JSON.stringify({ ok: true, id: inserted.id }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    } catch (error) {
        console.error('[Webhook] Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
