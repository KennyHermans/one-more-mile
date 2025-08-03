import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { trip_id } = await req.json();

    if (!trip_id) {
      return new Response(JSON.stringify({ error: 'trip_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Triggering backup assignment for trip: ${trip_id}`);

    // Force trigger backup requests for this specific trip
    const { data: requestResults, error: requestError } = await supabase
      .rpc('request_backup_senseis', {
        p_trip_id: trip_id,
        p_max_requests: 3
      });

    if (requestError) {
      console.error(`Error requesting backup senseis for trip ${trip_id}:`, requestError);
      return new Response(JSON.stringify({ error: requestError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (requestResults && requestResults.length > 0) {
      // Get trip details for notifications
      const { data: trip } = await supabase
        .from('trips')
        .select('title')
        .eq('id', trip_id)
        .single();

      // Create notifications for each sensei
      for (const request of requestResults) {
        await supabase.functions.invoke('send-backup-request-notification', {
          body: {
            requestId: request.request_id,
            senseiId: request.sensei_id,
            tripId: trip_id,
            tripTitle: trip?.title || 'Trip',
            matchScore: request.match_score
          }
        });
      }

      console.log(`Successfully created ${requestResults.length} backup requests`);
      
      return new Response(JSON.stringify({
        success: true,
        message: `Created ${requestResults.length} backup requests`,
        requests: requestResults
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({
        success: false,
        message: 'No suitable backup senseis found'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error: any) {
    console.error('Error in trigger-backup-assignment function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

serve(handler);