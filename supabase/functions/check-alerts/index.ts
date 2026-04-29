import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // ── Weekday guard: Only send Mon-Fri in Argentina timezone ──
        const nowArg = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
        const dayOfWeek = nowArg.getDay(); // 0=Sun, 6=Sat
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            console.log(`[Alerts] Skipping — today is ${dayOfWeek === 0 ? 'Sunday' : 'Saturday'} in Argentina`);
            return new Response(JSON.stringify({ skipped: true, reason: 'Weekend' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        // 1. Get reports with implementation_date that are active
        const { data: reports, error } = await supabase
            .from('reports')
            .select('*')
            .not('implementation_date', 'is', null)
            .neq('status', 'resolved')
            .neq('status', 'discarded');

        if (error) throw error;

        const results = [];

        // Use UTC dateparts for reliable day difference
        const now = new Date();
        const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

        for (const report of reports) {
            if (!report.assigned_to) continue; // No responsible contact

            // report.implementation_date is "YYYY-MM-DD"
            const [y, m, d] = report.implementation_date.split('-').map(Number);
            const targetUTC = Date.UTC(y, m - 1, d);

            const diffMs = targetUTC - todayUTC;
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

            let messagePrefix = "";
            let shouldSend = false;

            // Trigger Logic: 5 days, 2 days, 0 days
            if (diffDays === 5) {
                messagePrefix = "⏳ *Recordatorio (5 días)*";
                shouldSend = true;
            } else if (diffDays === 2) {
                messagePrefix = "⚠️ *Recordatorio (2 días)*";
                shouldSend = true;
            } else if (diffDays === 0) {
                messagePrefix = "🚨 *Vence HOY*";
                shouldSend = true;
            }

            if (shouldSend) {
                const botNumber = `549${report.assigned_to.replace(/\D/g, '').replace(/^549/, '')}`;
                const dayLabel = diffDays === 0 ? "HOY" : `${diffDays} días`;

                const message = `${messagePrefix}\n\nEstimado/a, le recordamos que faltan *${dayLabel}* para el vencimiento del plazo de solución del caso *${report.tracking_id}*.\n\n📂 Sector: ${report.sector || 'N/A'}\n📝 Plan: "${report.corrective_plan || 'Sin descripción'}"\n\nPor favor asegúrese de finalizar la implementación.`;

                const builderbotToken = Deno.env.get('BUILDERBOT_TOKEN');

                if (builderbotToken) {
                    console.log(`[Alerts] Sending to ${botNumber}: ${dayLabel} remaining`);

                    const response = await fetch('https://app.builderbot.cloud/api/v2/9981a143-f290-4ebe-a426-21c4d234371c/messages', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-api-builderbot': builderbotToken
                        },
                        body: JSON.stringify({
                            messages: {
                                content: message,
                                mediaUrl: "https://i.imgur.com/jgX2y4n.png" // Using the 'Alert' image from other parts of the app
                            },
                            number: botNumber,
                            checkIfExists: false
                        })
                    });

                    if (response.ok) {
                        results.push({ id: report.id, status: 'sent', diffDays });
                    } else {
                        const errData = await response.json();
                        console.error(`[Alerts] Provider Error for ${report.id}:`, errData);
                        results.push({ id: report.id, status: 'failed_provider', error: errData });
                    }
                } else {
                    console.error('[Alerts] Missing BUILDERBOT_TOKEN');
                    results.push({ id: report.id, status: 'fake_sent_no_token', diffDays });
                }
            }
        }

        return new Response(JSON.stringify({
            processed: reports.length,
            alerts_sent_count: results.length,
            details: results
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error('[Alerts] Critical Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
});
