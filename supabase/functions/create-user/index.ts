// supabase/functions/create-user/index.ts
// Edge Function para crear usuarios con rol asignado (solo Admin)
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
        // 1. Verify the calling user is an admin
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'No autorizado' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // Create client with the caller's token to verify admin status
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

        const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } },
        })

        const { data: { user: callerUser } } = await callerClient.auth.getUser()
        if (!callerUser) {
            return new Response(JSON.stringify({ error: 'Usuario no autenticado' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // Check if the caller is admin
        const { data: callerProfile } = await callerClient
            .from('user_profiles')
            .select('role')
            .eq('user_id', callerUser.id)
            .single()

        if (!callerProfile || callerProfile.role !== 'admin') {
            return new Response(JSON.stringify({ error: 'Solo administradores pueden crear usuarios' }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // 2. Parse body
        const { email, password, role } = await req.json()

        if (!email || !password) {
            return new Response(JSON.stringify({ error: 'Email y contraseña son requeridos' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const validRoles = ['admin', 'responsable', 'directivo']
        const userRole = validRoles.includes(role) ? role : 'responsable'

        // 3. Use service role client to create the user
        const adminClient = createClient(supabaseUrl, supabaseServiceKey)

        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm email
            user_metadata: { display_name: email },
        })

        if (createError) {
            return new Response(JSON.stringify({ error: createError.message }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // 4. Update the auto-created profile with the correct role
        if (newUser?.user?.id) {
            // Wait a moment for the trigger to create the profile
            await new Promise(resolve => setTimeout(resolve, 500))

            const { error: updateError } = await adminClient
                .from('user_profiles')
                .update({ role: userRole })
                .eq('user_id', newUser.user.id)

            if (updateError) {
                console.error('Error updating profile role:', updateError)
                // Profile might not exist yet, try inserting
                await adminClient.from('user_profiles').upsert({
                    user_id: newUser.user.id,
                    role: userRole,
                    display_name: email,
                    assigned_sectors: [],
                    sector_edit_count: 0,
                }, { onConflict: 'user_id' })
            }
        }

        return new Response(
            JSON.stringify({
                message: 'Usuario creado exitosamente',
                user: { id: newUser?.user?.id, email: newUser?.user?.email, role: userRole }
            }),
            {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        )

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
