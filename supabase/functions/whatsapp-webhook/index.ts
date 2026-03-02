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
            contactName = data.name || '';

            // Process attachments
            if (data.attachment && Array.isArray(data.attachment) && data.attachment.length > 0) {
                const att = data.attachment[0];
                mediaUrl = att.url || att.payload || '';

                // Detect type from URL or MIME
                if (mediaUrl) {
                    if (mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)/i)) {
                        messageType = 'image';
                    } else if (mediaUrl.match(/\.(mp4|mov|avi|webm)/i)) {
                        messageType = 'video';
                    } else if (mediaUrl.match(/\.(ogg|opus|mp3|m4a|wav)/i)) {
                        messageType = 'audio';
                    } else if (mediaUrl.match(/\.(pdf|doc|docx|xls|xlsx)/i)) {
                        messageType = 'document';
                    } else {
                        messageType = 'image'; // default for unknown media
                    }
                }

                // If there's both text and media, keep the text in body
                if (!body && messageType !== 'text') {
                    body = `[${messageType}]`;
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
