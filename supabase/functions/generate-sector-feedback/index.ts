import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { sector, reports } = await req.json();

        if (!sector || !reports || reports.length === 0) {
            return new Response(
                JSON.stringify({ feedback: 'No hay suficientes datos para generar un insight.' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const apiKey = Deno.env.get('OPENAI_API_KEY');
        if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

        // Build context from reports
        const reportsContext = reports
            .slice(0, 20) // Max 20 reports
            .map((r: any, i: number) => `${i + 1}. [${r.status}] ${r.ai_summary || r.content?.substring(0, 100)}`)
            .join('\n');

        const prompt = `Eres un coach de calidad hospitalaria empático y motivador.
        
Analiza estos reportes del sector "${sector}" de un sanatorio:

${reportsContext}

Tu tarea:
1. Identifica el patrón o tema recurrente más importante.
2. Genera un mensaje BREVE (máximo 3 líneas) que sea:
   - Empático y motivador (NO regañar ni culpar)
   - Que reconozca el trabajo del equipo
   - Que sugiera UNA mejora concreta y alcanzable
   - Tono cálido y profesional

Ejemplo de tono: "El equipo ha tenido varios reportes sobre tiempos de espera esta semana. ¡Es una gran oportunidad para revisar los turnos de la mañana y brillar de nuevo!"

Responde SOLO el mensaje motivacional, sin formato JSON ni markdown.`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 200,
                temperature: 0.7,
            }),
        });

        const data = await response.json();
        const feedback = data.choices?.[0]?.message?.content?.trim() || 'No se pudo generar el insight en este momento.';

        return new Response(
            JSON.stringify({ feedback }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Sector feedback error:', error);
        return new Response(
            JSON.stringify({ error: 'Error generando feedback', feedback: 'No se pudo generar el insight. Intente nuevamente.' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
