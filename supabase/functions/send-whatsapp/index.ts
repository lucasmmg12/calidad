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
            throw new Error('Missing BUILDERBOT_TOKEN env var')
        }

        if (!number || !message) {
            throw new Error('Missing number or message')
        }

        console.log(`[WhatsApp] Sending to ${number}: ${message.substring(0, 50)}...`)

        const response = await fetch('https://app.builderbot.cloud/api/v2/c3fd918b-b736-40dc-a841-cbb73d3b2a8d/messages', {
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

        const data = await response.json()

        if (!response.ok) {
            console.error('[WhatsApp] Provider Error:', data)
            throw new Error(`Provider Error: ${JSON.stringify(data)}`)
        }

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error) {
        console.error('[WhatsApp] Error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
