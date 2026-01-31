import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { reports, startDate, endDate } = await req.json()

        const openAiKey = Deno.env.get('OPENAI_API_KEY')
        if (!openAiKey) {
            throw new Error('Server Config Error: Missing OpenAI Key');
        }

        const reportContext = reports.map((r: any) => ({
            id: r.tracking_id,
            date: r.created_at,
            sector: r.sector,
            content: r.content,
            status: r.status,
            ai_summary: r.ai_summary,
            ai_category: r.ai_category,
            ai_urgency: r.ai_urgency,
            ai_solutions: r.ai_solutions
        }));

        const prompt = `
      Eres un consultor senior en Gestión de Calidad en Salud y Seguridad del Paciente para el Sanatorio Argentino.
      Tu tarea es realizar un Informe de Inteligencia de Calidad basado en un conjunto de datos de reportes de incidentes.
      
      Periodo del informe: ${startDate} al ${endDate}
      Total de reportes recibidos: ${reports.length}
      
      DATOS DE REPORTES:
      ${JSON.stringify(reportContext)}

      Debes realizar un análisis profundo estructurado en 4 partes EXACTAS:
      
      1. ANÁLISIS DESCRIPTIVO: Resume cuantitativamente qué ocurrió este periodo. Menciona los sectores más afectados y los tipos de casos predominantes.
      2. ANÁLISIS DIAGNÓSTICO: Identifica patrones y causas raíz. ¿Por qué están ocurriendo estos incidentes? Busca hilos conductores entre diferentes reportes.
      3. ANÁLISIS PREDICTIVO: Basado en estos datos, ¿qué riesgos ves para el próximo periodo? Identifica "puntos calientes" y tipos de incidentes que podrían repetirse o intensificarse si no se actúa.
      4. ANÁLISIS PRESCRIPTIVO: Proporciona 3 a 5 recomendaciones estratégicas concretas para el Comité de Calidad del Sanatorio para mitigar los riesgos detectados.

      IMPORTANTE:
      - Mantén un tono formal, profesional y de liderazgo médico.
      - Sé específico basándote en los datos proporcionados.
      - Responde ÚNICAMENTE en formato JSON con la siguiente estructura:
      {
        "descriptive": "Texto del análisis...",
        "diagnostic": "Texto del análisis...",
        "predictive": "Texto del análisis...",
        "prescriptive": "Texto del análisis..."
      }
    `;

        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openAiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.4
            })
        })

        if (!aiResponse.ok) {
            const errBody = await aiResponse.text();
            throw new Error(`AI Service Error: ${errBody}`);
        }

        const aiData = await aiResponse.json()
        let content = aiData.choices[0].message.content;
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();

        return new Response(content, {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
