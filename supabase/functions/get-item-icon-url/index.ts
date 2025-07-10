import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { itemName } = await req.json()
    if (!itemName) {
      return new Response(JSON.stringify({ error: 'itemName is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Utiliser la clé de service pour avoir les droits de créer une URL signée
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Générer une URL signée valide pour 60 secondes
    const { data, error } = await supabaseAdmin
      .storage
      .from('items.icons')
      .createSignedUrl(itemName, 60) // 60 secondes de validité

    if (error) {
      throw error
    }

    return new Response(JSON.stringify({ signedUrl: data.signedUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (e) {
    console.error('Error in get-item-icon-url function:', e)
    return new Response(JSON.stringify({ error: e.message || 'Internal Server Error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})