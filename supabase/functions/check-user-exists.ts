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

    try {
      // This will throw an error if the user is not found.
      await supabaseAdmin.auth.admin.getUserByEmail(email)
      return new Response(JSON.stringify({ exists: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    } catch (error) {
      if (error.message.includes('User not found')) {
        return new Response(JSON.stringify({ exists: false }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }
      throw error // Re-throw other errors
    }
  } catch (e) {
    console.error('Error in check-user-exists function:', e)
    return new Response(JSON.stringify({ error: e.message || 'Internal Server Error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})