import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { reports, startDate, endDate } = await req.json()

        if (!reports || reports.length === 0) {
            throw new Error('No hay reportes para analizar en este periodo.')
        }

        const openAiKey = Deno.env.get('OPENAI_API_KEY')
        if (!openAiKey) {
            throw new Error('Configuración de Servidor: Falta OPENAI_API_KEY en Supabase.');
        }

        // Simplificar reportes para ahorrar tokens y evitar errores de tamaño
        const reportContext = reports.slice(0, 50).map((r: any) => ({
            sector: r.sector,
            content: r.content?.substring(0, 200), // Solo los primeros 200 caracteres
            urgency: r.ai_urgency,
            category: r.ai_category
        }));

        const prompt = `
      Actúa como el Director de Calidad del Sanatorio Argentino. 
      Analiza estos reportes (${startDate} a ${endDate}):
      ${JSON.stringify(reportContext)}

      Genera un reporte de inteligencia clínica con 4 secciones:
      1. descriptive: Resumen de qué pasó y áreas críticas.
      2. diagnostic: Por qué ocurrió (causas raíz detectadas).
      3. predictive: Qué riesgos ves para el próximo mes.
      4. prescriptive: 3 acciones estratégicas para mejorar.

      IMPORTANTE: Responde ÚNICAMENTE con un objeto JSON válido. NO incluyas texto extra, ni bloques de código markdown.
      Formato: {"descriptive": "...", "diagnostic": "...", "predictive": "...", "prescriptive": "..."}
    `;

        console.log(`[Intelligence] Iniciando análisis para ${reports.length} reportes...`);

        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openAiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'Eres un analista de datos de salud que solo responde en JSON puro.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3,
                response_format: { type: "json_object" } // Fuerza respuesta JSON
            })
        })

        if (!aiResponse.ok) {
            const errBody = await aiResponse.text();
            console.error('OpenAI Error:', errBody);
            throw new Error(`Error de OpenAI: ${aiResponse.status}`);
        }

        const aiData = await aiResponse.json()
        const content = aiData.choices[0].message.content;

        console.log("[Intelligence] Análisis completado con éxito.");

        return new Response(content, {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error('[Intelligence Error]:', error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
