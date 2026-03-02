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
        const { number, message, mediaUrl } = await req.json()
        const builderbotToken = Deno.env.get('BUILDERBOT_TOKEN')

        if (!builderbotToken) {
            console.error('[WhatsApp] BUILDERBOT_TOKEN not set')
            throw new Error('Missing BUILDERBOT_TOKEN env var')
        }

        if (!number || !message) {
            console.error('[WhatsApp] Missing params:', { number: !!number, message: !!message })
            throw new Error(`Missing number or message. Got number=${number}, message length=${message?.length}`)
        }

        console.log(`[WhatsApp] Sending to ${number}: ${message.substring(0, 80)}...`)

        const response = await fetch('https://app.builderbot.cloud/api/v2/9981a143-f290-4ebe-a426-21c4d234371c/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-builderbot': builderbotToken
            },
            body: JSON.stringify({
                messages: {
                    content: message,
                    mediaUrl: mediaUrl || ""
                },
                number: number,
                checkIfExists: false
            })
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
