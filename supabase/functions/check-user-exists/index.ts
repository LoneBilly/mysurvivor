import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient, AuthError } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

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
    const { data, error } = await supabaseAdmin.auth.admin.getUserByEmail(email);

    if (error) {
      // Si l'erreur indique que l'utilisateur n'a pas été trouvé, cela signifie que l'e-mail n'existe pas.
      // Les erreurs d'authentification de Supabase ont un statut, 404 pour "non trouvé".
      if (error instanceof AuthError && error.status === 404) {
        return new Response(JSON.stringify({ exists: false }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      // Pour toute autre erreur, la renvoyer pour qu'elle soit capturée par le bloc catch externe.
      throw error;
    }

    // Si des données sont retournées sans erreur, l'utilisateur existe.
    const exists = !!data.user;

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