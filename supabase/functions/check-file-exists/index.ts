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
    const { bucket, path } = await req.json()
    if (!bucket || !path) {
      return new Response(JSON.stringify({ error: 'Bucket and path are required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data, error } = await supabaseAdmin
      .storage
      .from(bucket)
      .list('', {
        limit: 1,
        search: path,
      });

    if (error) {
      // Si le bucket n'existe pas, ou autre erreur de storage
      if (error.message.includes("Bucket not found")) {
         return new Response(JSON.stringify({ exists: false, error: 'Bucket not found' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }
      throw error
    }

    const fileExists = data && data.length > 0 && data.some(file => file.name === path);

    return new Response(JSON.stringify({ exists: fileExists }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (e) {
    console.error('Error in check-file-exists function:', e)
    return new Response(JSON.stringify({ error: e.message || 'Internal Server Error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})