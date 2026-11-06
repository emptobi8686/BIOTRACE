// BIOTRACE Supabase Edge Function: verify-cac
// Server-side integration with Nigerian CAC business verification provider (FastCAC)
// Keep FASTCAC_API_KEY in Supabase secrets, never in client-side code.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  registrationNumber: string
  companyName?: string
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const fastCacApiKey = Deno.env.get('FASTCAC_API_KEY')

    // 1. Authenticate caller using Supabase Auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: valid user session required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Parse request payload
    const body: RequestBody = await req.json()
    const rawRc = (body.registrationNumber ?? '').trim()
    const rawName = (body.companyName ?? '').trim()

    if (!rawRc || rawRc.length < 2) {
      return new Response(
        JSON.stringify({ error: 'Valid business registration number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Live FastCAC API integration (if FASTCAC_API_KEY is configured in Supabase secrets)
    if (fastCacApiKey && fastCacApiKey.trim()) {
      const idempotencyKey = crypto.randomUUID()
      const fastCacRes = await fetch('https://api.fastcac.com/v1/businesses/verifications', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${fastCacApiKey.trim()}`,
          'Idempotency-Key': idempotencyKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          registration_number: rawRc,
          company_name: rawName || undefined,
        }),
      })

      if (!fastCacRes.ok) {
        const errorText = await fastCacRes.text()
        console.error('FastCAC API returned non-200:', fastCacRes.status, errorText)
        return new Response(
          JSON.stringify({
            status: 'error',
            registrationNumber: rawRc,
            verifiedAt: new Date().toISOString(),
            isMock: false,
            message: `FastCAC API error (${fastCacRes.status}): ${errorText}`,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const cacJson = await fastCacRes.json()
      const data = cacJson.data || {}
      const matchStatus = data.match_status || (cacJson.status === 'success' ? 'match' : 'no_match')

      return new Response(
        JSON.stringify({
          status: matchStatus,
          companyName: data.name || rawName,
          registrationNumber: data.rc_number || rawRc,
          companyType: data.classification,
          registrationDate: data.registration_date,
          address: data.address,
          isActive: data.active ?? true,
          verifiedAt: new Date().toISOString(),
          isMock: false,
          message: 'Verified directly against the official CAC registry via FastCAC.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Sandbox fallback when FASTCAC_API_KEY is not yet provisioned in secrets
    const normalized = rawRc.toUpperCase()
    const now = new Date().toISOString()

    if (normalized.includes('NOTFOUND') || normalized.includes('000000')) {
      return new Response(
        JSON.stringify({
          status: 'not_found',
          registrationNumber: normalized,
          verifiedAt: now,
          isMock: true,
          message: 'No company with this registration number exists on the CAC registry (Sandbox).',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const isBn = normalized.startsWith('BN')
    return new Response(
      JSON.stringify({
        status: 'match',
        registrationNumber: normalized,
        companyName: rawName || `VERIFIED ${normalized} LTD`,
        companyType: isBn ? 'Business Name (Enterprise)' : 'Private Company Limited by Shares (RC)',
        registrationDate: '2022-01-15',
        address: 'Abuja Federal Capital Territory, Nigeria',
        isActive: true,
        verifiedAt: now,
        isMock: true,
        message: 'Sandbox verification successful. Provision FASTCAC_API_KEY in Supabase secrets for live production lookups.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Edge Function uncaught error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

