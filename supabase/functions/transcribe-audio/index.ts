import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { audio, mimeType, extension } = await req.json()

        if (!audio) {
            throw new Error('No se recibió audio para transcribir.')
        }

        const openAiKey = Deno.env.get('OPENAI_API_KEY')
        if (!openAiKey) {
            console.error("Falta OPENAI_API_KEY");
            throw new Error('Error de configuración: Falta OPENAI_API_KEY en el servidor.')
        }

        console.log(`[Transcribe] Recibido audio (${extension || 'webm'}), base64 length: ${audio.length}`)

        // ── PASO 1: Decodificar base64 a Blob ──
        const binaryString = atob(audio)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
        }

        const audioBlob = new Blob([bytes], { type: mimeType || 'audio/webm' })
        const fileName = `recording.${extension || 'webm'}`

        console.log(`[Transcribe] Audio decodificado: ${audioBlob.size} bytes`)

        // ── PASO 2: Transcripción con Whisper ──
        const formData = new FormData()
        formData.append('file', audioBlob, fileName)
        formData.append('model', 'whisper-1')
        formData.append('language', 'es')
        formData.append('response_format', 'text')

        console.log(`[Transcribe] Enviando a Whisper API...`)

        const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openAiKey}`,
            },
            body: formData,
        })

        if (!whisperResponse.ok) {
            const errBody = await whisperResponse.text()
            console.error(`Whisper Error (${whisperResponse.status}):`, errBody)
            throw new Error(`Error de Whisper: ${errBody}`)
        }

        const rawTranscript = await whisperResponse.text()
        console.log(`[Transcribe] Whisper raw: "${rawTranscript.substring(0, 100)}..."`)

        if (!rawTranscript || rawTranscript.trim().length === 0) {
            throw new Error('No se detectó voz en el audio. Intenta hablar más fuerte o más cerca del micrófono.')
        }

        // ── PASO 3: Limpieza inteligente con GPT-4o-mini ──
        console.log(`[Transcribe] Limpiando con GPT-4o-mini...`)

        const cleanupPrompt = `Eres un asistente de transcripción médica para el Sanatorio Argentino. 
Tu tarea es limpiar y mejorar la siguiente transcripción de audio de un reporte de calidad hospitalaria.

Transcripción original:
"${rawTranscript}"

Instrucciones:
1. Corrige errores gramaticales menores
2. Elimina muletillas ("eh", "este", "bueno", "o sea", "digamos")
3. Agrega puntuación profesional (puntos, comas, punto y coma)
4. Mantén el tono y contenido original del hablante — NO inventes información
5. Si menciona términos médicos, asegúrate de escribirlos correctamente
6. Estructura en párrafos si el texto es largo (más de 3 oraciones)
7. NO agregues títulos, formato markdown, ni explicaciones adicionales

Devuelve SOLAMENTE el texto limpio y formateado, sin comillas ni explicaciones.`

        const cleanupResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openAiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'Eres un editor de texto médico que solo responde con el texto limpio, sin explicaciones adicionales.'
                    },
                    {
                        role: 'user',
                        content: cleanupPrompt
                    }
                ],
                temperature: 0.2,
                max_tokens: 2000,
            }),
        })

        if (!cleanupResponse.ok) {
            // If cleanup fails, return raw transcript (still usable)
            console.error(`GPT Cleanup Error (${cleanupResponse.status}), returning raw transcript`)
            return new Response(JSON.stringify({ text: rawTranscript.trim() }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        const cleanupData = await cleanupResponse.json()
        let cleanText = cleanupData.choices[0].message.content?.trim() || rawTranscript.trim()

        // Remove surrounding quotes if GPT added them
        if ((cleanText.startsWith('"') && cleanText.endsWith('"')) ||
            (cleanText.startsWith('«') && cleanText.endsWith('»'))) {
            cleanText = cleanText.slice(1, -1).trim()
        }

        console.log(`[Transcribe] ✅ Limpieza completada. Texto final: "${cleanText.substring(0, 100)}..."`)

        return new Response(JSON.stringify({ text: cleanText }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error('[Transcribe Error]:', error.message)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
