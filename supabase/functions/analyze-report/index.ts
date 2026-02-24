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
        const { reportText, reportId, contactNumber, evidenceUrls } = await req.json()

        // 0. Init Supabase Client
        // FALLBACK: If standard env vars fail, use specific mapped ones if configured. 
        // We prioritize Service Role for admin tasks (updating ANY row).
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Server Misconfiguration: Missing DB Keys.')
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

        console.log(`[Analyze] Procesando reporte ${reportId}. Texto largo: ${reportText?.length}`);

        // 1. Analyze with OpenAI
        const openAiKey = Deno.env.get('OPENAI_API_KEY')
        if (!openAiKey) {
            console.error("Falta OPENAI_API_KEY");
            throw new Error('Server Config Error: Missing OpenAI Key');
        }

        const prompt = `
      Eres un experto en Gestión de Calidad Clínica y Seguridad del Paciente (Normas Joint Commission / OMS).
      Analiza el siguiente reporte incidente en una clínica:
      "${reportText}"
      
      Tareas:
      1. Resume el problema (Máx 15 palabras).
      2. Clasifícalo en UNA de estas categorías operativas (elegir la más adecuada):
         "Calidez en la atención", "Capacitación", "Cirugía segura", "Comunicación con el paciente", "Comunicación efectiva interservicios", "Demora en la atención", "Gestión de turnos", "Identificación del paciente", "Mantenimiento e infraestructura", "Prácticas administrativas", "Prácticas asistenciales", "Recursos e insumos", "Riesgo de caídas", "Seguridad de los medicamentos", "Sistema informático".
         Si no encaja claramente en ninguna, usa "Sin clasificar".
      3. Determina el Triage de Urgencia (Color) BASADO ESTRICTAMENTE en:
         - 🔴 ROJO (Inmediato): FALTA DE LUZ/AGUA/OXÍGENO, Riesgo de vida, daño permanente, cirugía en sitio incorrecto, caída con daño, violencia física/sexual, neonatología, falta de insumos críticos.
         - 🟡 AMARILLO (Urgente): Riesgo de daño temporal, error de medicación, retraso en atención, fallas de equipos menores.
         - 🟢 VERDE (Rutina): Sugerencias, reclamos de hotelería/confort, felicitaciones.
      4. Consecuencias Potenciales: Describe en 1 frase qué pasaría si esto no se soluciona hoy.
      5. Soluciones Recomendadas: Enumera 3 acciones concretas.

      Responde SOLO en formato JSON puro: { "summary": "...", "category": "...", "color": "...", "consequences": "...", "solutions": "..." }
    `

        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openAiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3
            })
        })

        if (!aiResponse.ok) {
            const errBody = await aiResponse.text();
            console.error(`OpenAI Error (${aiResponse.status}):`, errBody);
            throw new Error(`AI Service Error: ${errBody}`);
        }

        const aiData = await aiResponse.json()
        let content = aiData.choices[0].message.content;

        // Sanitize content (remove markdown code blocks if present)
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();

        console.log("[Analyze] Respuesta AI cruda:", content);
        const result = JSON.parse(content)

        // Sanitize fields (remove emojis and extra spaces)
        // cleanString removes emojis and trims
        const cleanString = (str: string) => str?.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim() || '';

        // Map allowed colors specifically to match DB Constraint ('Verde', 'Amarillo', 'Rojo')
        let cleanColor = cleanString(result.color);
        if (cleanColor.toUpperCase().includes('ROJO') || cleanColor.toUpperCase().includes('RED')) cleanColor = 'Rojo';
        else if (cleanColor.toUpperCase().includes('AMARILLO') || cleanColor.toUpperCase().includes('YELLOW')) cleanColor = 'Amarillo';
        else if (cleanColor.toUpperCase().includes('VERDE') || cleanColor.toUpperCase().includes('GREEN')) cleanColor = 'Verde';
        else cleanColor = 'Amarillo'; // Fallback to Amarillo (Safer than Verde)

        // 2. Update Report in DB With AI Results
        const { error: updateError } = await supabase
            .from('reports')
            .update({
                ai_summary: cleanString(result.summary),
                ai_category: cleanString(result.category),
                ai_urgency: cleanColor,
                ai_consequences: cleanString(result.consequences),
                ai_solutions: Array.isArray(result.solutions) ? result.solutions.map((s: string) => `• ${s}`).join('\n') : cleanString(result.solutions),
                status: 'analyzed'
            })
            .eq('tracking_id', reportId)

        if (updateError) {
            console.error('Error updating report:', updateError)
            throw new Error(`DB Error: ${updateError.message} (Details: ${updateError.details})`)
        }

        // 3. If RED, Send WhatsApp Alert
        console.log(`[Analyze] Urgencia detectada: ${cleanColor}`);

        if (cleanColor === 'Rojo') {
            const builderbotToken = Deno.env.get('BUILDERBOT_TOKEN')

            if (builderbotToken) {
                // Fetch all active alert recipients from DB
                const { data: recipientsData, error: recipientsError } = await supabase
                    .from('alert_recipients')
                    .select('phone_number, display_name')
                    .eq('is_active', true);

                // Fallback to hardcoded number if DB query fails
                const alertRecipients = (recipientsError || !recipientsData || recipientsData.length === 0)
                    ? [{ phone_number: '2644396596', display_name: 'Claudia (fallback)' }]
                    : recipientsData;

                if (recipientsError) {
                    console.error('[Analyze] Error fetching alert_recipients, using fallback:', recipientsError);
                }

                console.log(`[Analyze] Enviando Alerta Roja a ${alertRecipients.length} destinatario(s)`);

                const evidenceTxt = evidenceUrls && evidenceUrls.length > 0 ? `\n📸 Evidencia: ${evidenceUrls[0]}` : '';

                const alertMessage = `⚠️ *NOTIFICACIÓN DE RIESGO CRÍTICO* ⚠️\n\nSe ha detectado un reporte con prioridad *ROJA* que requiere atención inmediata.\n\n📝 *Resumen:* ${cleanString(result.summary)}\n📍 *Clasificación:* ${cleanString(result.category)}\n🆔 *ID de Seguimiento:* ${reportId}\n\n🚨 *Consecuencia Potencial:* ${cleanString(result.consequences)}\n\n━━━━━━━━━━━━━━━━\n📢 *Acción Requerida:* Por favor, inicie el protocolo de respuesta ante incidentes y verifique el estado en el Dashboard de Calidad.\n\n${evidenceTxt}`;

                // Send to ALL active recipients in parallel
                const sendPromises = alertRecipients.map(async (recipient) => {
                    const botFormatNumber = `549${recipient.phone_number}`;
                    console.log(`[Analyze] → Enviando a ${recipient.display_name} (${botFormatNumber})`);

                    const payload: any = {
                        number: botFormatNumber,
                        messages: {
                            content: alertMessage,
                        },
                        checkIfExists: false
                    };

                    if (evidenceUrls && evidenceUrls.length > 0) {
                        payload.messages.mediaUrl = evidenceUrls[0];
                    }

                    try {
                        const resp = await fetch('https://app.builderbot.cloud/api/v2/9981a143-f290-4ebe-a426-21c4d234371c/messages', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'x-api-builderbot': builderbotToken
                            },
                            body: JSON.stringify(payload)
                        });

                        if (!resp.ok) {
                            const errText = await resp.text();
                            console.error(`[Analyze] Error enviando a ${recipient.display_name}: ${resp.status} - ${errText}`);
                        } else {
                            console.log(`[Analyze] ✅ Alerta enviada a ${recipient.display_name}`);
                        }
                    } catch (fetchErr) {
                        console.error(`[Analyze] Fallo fetch alerta a ${recipient.display_name}:`, fetchErr);
                    }
                });

                await Promise.allSettled(sendPromises);
                console.log(`[Analyze] Proceso de alertas rojas completado.`);
            } else {
                console.error('[Analyze] Missing BUILDERBOT_TOKEN for alert')
            }
        }

        // 4. Send confirmation to user (if contactNumber provided)
        // 4. Confirmation is now handled by the frontend via 'send-whatsapp' function 
        // to avoid waiting for AI analysis latency.

        return new Response(JSON.stringify(result), {
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
