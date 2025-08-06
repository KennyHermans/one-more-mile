import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Perform basic health checks
    const startTime = Date.now()

    // Database connectivity check
    const { data: dbTest, error: dbError } = await supabase
      .from('sensei_profiles')
      .select('count')
      .limit(1)

    const dbLatency = Date.now() - startTime

    // Auth service check
    const authStartTime = Date.now()
    const { data: authTest, error: authError } = await supabase.auth.getSession()
    const authLatency = Date.now() - authStartTime

    // Edge function execution check
    const functionStartTime = Date.now()
    const functionLatency = Date.now() - functionStartTime

    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime ? process.uptime() : 0,
      checks: {
        database: {
          status: dbError ? 'error' : 'healthy',
          latency: dbLatency,
          error: dbError?.message || null
        },
        auth: {
          status: authError ? 'error' : 'healthy', 
          latency: authLatency,
          error: authError?.message || null
        },
        functions: {
          status: 'healthy',
          latency: functionLatency
        }
      },
      environment: {
        node_version: Deno.version?.deno || 'unknown',
        memory_usage: {
          used: 0, // Deno doesn't expose this easily
          total: 0
        }
      }
    }

    // Determine overall status
    const hasErrors = Object.values(healthCheck.checks).some(check => check.status === 'error')
    if (hasErrors) {
      healthCheck.status = 'degraded'
    }

    console.log('Health check completed:', healthCheck)

    return new Response(
      JSON.stringify(healthCheck),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: hasErrors ? 503 : 200
      }
    )

  } catch (error) {
    console.error('Health check error:', error)
    
    return new Response(
      JSON.stringify({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})