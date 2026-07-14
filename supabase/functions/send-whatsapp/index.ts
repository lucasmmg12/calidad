import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { number, message, mediaUrl, templateName, languageCode, templateVariables } = await req.json()
        const builderbotToken = Deno.env.get('BUILDERBOT_TOKEN')

        if (!builderbotToken) {
            console.error('[WhatsApp] BUILDERBOT_TOKEN not set')
            throw new Error('Missing BUILDERBOT_TOKEN env var')
        }

        if (!number) {
            console.error('[WhatsApp] Missing number')
            throw new Error(`Missing number. Got number=${number}`)
        }

        if (!templateName && !message) {
            console.error('[WhatsApp] Missing both templateName and message')
            throw new Error(`Missing templateName or message.`)
        }

        let apiUrl = 'https://app.builderbot.cloud/api/v2/9981a143-f290-4ebe-a426-21c4d234371c/messages';
        let apiBody: any = {
            number: number,
            checkIfExists: false
        };

        if (templateName) {
            console.log(`[WhatsApp] Sending template ${templateName} to ${number}...`)
            apiUrl = 'https://app.builderbot.cloud/api/v2/9981a143-f290-4ebe-a426-21c4d234371c/whatsapp-template';
            
            const parameters = (templateVariables || []).map((text: string) => {
                // Meta API rejects template parameters with newlines, tabs, or consecutive spaces
                const sanitizedText = (text || '').toString()
                    .replace(/[\n\r\t]+/g, ' ')
                    .replace(/\s{2,}/g, ' ')
                    .trim();
                return {
                    type: "text",
                    text: sanitizedText
                };
            });

            apiBody = {
                to: number,
                templateName: templateName,
                languageCode: languageCode || 'es_AR',
                components: [
                    {
                        type: "body",
                        parameters: parameters
                    }
                ]
            };
        } else {
            console.log(`[WhatsApp] Sending to ${number}: ${message?.substring(0, 80)}...`)
            const messagesPayload: any = { content: message };
            if (mediaUrl && mediaUrl.trim() !== '') {
                messagesPayload.mediaUrl = mediaUrl;
            }
            apiBody.messages = messagesPayload;
        }

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-builderbot': builderbotToken
            },
            body: JSON.stringify(apiBody)
        })

        // Safely read response body (may not be JSON)
        let data: any = null
        const responseText = await response.text()
        try {
            data = JSON.parse(responseText)
        } catch {
            data = { rawResponse: responseText }
        }

        console.log(`[WhatsApp] Provider status: ${response.status}, body: ${responseText.substring(0, 200)}`)

        if (!response.ok) {
            console.error('[WhatsApp] Provider Error:', response.status, data)
            // Return the error but with more context
            return new Response(JSON.stringify({
                error: `Provider returned ${response.status}`,
                details: data,
                number: number,
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200, // Return 200 so the frontend doesn't crash — the message is logged
            })
        }

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error) {
        console.error('[WhatsApp] Error:', error.message, error.stack)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
