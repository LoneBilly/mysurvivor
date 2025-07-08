import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { email } = await req.json()
    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Utilise getUserByEmail pour une vérification plus directe et fiable
    const { data, error } = await supabaseAdmin.auth.admin.getUserByEmail(email)

    if (error) {
      // Si l'erreur est "User not found", cela signifie que l'utilisateur n'existe pas.
      // C'est le résultat attendu pour un nouvel utilisateur.
      if (error.message === 'User not found') {
        return new Response(JSON.stringify({ exists: false }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }
      // Pour toute autre erreur, nous la traitons comme une erreur serveur.
      console.error('Error checking user existence:', error.message)
      throw new Error('An unexpected error occurred while checking user existence.')
    }

    // S'il n'y a pas d'erreur et que nous avons des données utilisateur, l'utilisateur existe.
    const exists = !!data && !!data.user

    return new Response(JSON.stringify({ exists }), {
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