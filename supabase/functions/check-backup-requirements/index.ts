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

    console.log('Starting backup requirements check...');

    // Find trips that need backup senseis
    const { data: tripsNeedingBackup, error: tripsError } = await supabase
      .from('trips')
      .select('id, title, theme, dates, sensei_id, backup_sensei_id, backup_assignment_deadline, requires_backup_sensei')
      .eq('trip_status', 'approved')
      .eq('is_active', true)
      .eq('requires_backup_sensei', true)
      .is('backup_sensei_id', null);

    if (tripsError) {
      console.error('Error fetching trips:', tripsError);
      return new Response(JSON.stringify({ error: tripsError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Found ${tripsNeedingBackup?.length || 0} trips needing backup senseis`);

    let actionsCount = 0;
    const results = [];

    for (const trip of tripsNeedingBackup || []) {
      // Check if backup deadline has passed
      const deadline = new Date(trip.backup_assignment_deadline);
      const now = new Date();
      
      if (deadline <= now) {
        console.log(`Trip ${trip.title} (${trip.id}) deadline passed, requesting backup senseis...`);
        
        // Request backup senseis using the enhanced matching function
        const { data: requestResults, error: requestError } = await supabase
          .rpc('request_backup_senseis', {
            p_trip_id: trip.id,
            p_max_requests: 3
          });

        if (requestError) {
          console.error(`Error requesting backup senseis for trip ${trip.id}:`, requestError);
          continue;
        }

        if (requestResults && requestResults.length > 0) {
          // Create notifications for each sensei
          for (const request of requestResults) {
            await supabase.functions.invoke('send-backup-request-notification', {
              body: {
                requestId: request.request_id,
                senseiId: request.sensei_id,
                tripId: trip.id,
                tripTitle: trip.title,
                matchScore: request.match_score
              }
            });
          }
          
          actionsCount++;
          results.push({
            tripId: trip.id,
            tripTitle: trip.title,
            requestsSent: requestResults.length,
            senseis: requestResults.map(r => r.sensei_name)
          });
        }
      }
    }

    // Check for expired backup requests that need follow-up
    const { data: expiredRequests, error: expiredError } = await supabase
      .from('backup_sensei_requests')
      .select(`
        id, trip_id, response_deadline,
        trips!inner(id, title, theme, dates)
      `)
      .eq('status', 'pending')
      .lt('response_deadline', new Date().toISOString());

    if (expiredError) {
      console.error('Error fetching expired requests:', expiredError);
    } else {
      console.log(`Found ${expiredRequests?.length || 0} expired backup requests`);
      
      // Mark expired requests as expired and find new senseis
      for (const expiredRequest of expiredRequests || []) {
        await supabase
          .from('backup_sensei_requests')
          .update({ status: 'expired' })
          .eq('id', expiredRequest.id);

        // Request new backup senseis for this trip
        const { data: newRequests } = await supabase
          .rpc('request_backup_senseis', {
            p_trip_id: expiredRequest.trip_id,
            p_max_requests: 2
          });

        if (newRequests && newRequests.length > 0) {
          for (const request of newRequests) {
            await supabase.functions.invoke('send-backup-request-notification', {
              body: {
                requestId: request.request_id,
                senseiId: request.sensei_id,
                tripId: expiredRequest.trip_id,
                tripTitle: expiredRequest.trips.title,
                matchScore: request.match_score,
                isFollowUp: true
              }
            });
          }
          
          results.push({
            tripId: expiredRequest.trip_id,
            tripTitle: expiredRequest.trips.title,
            requestsSent: newRequests.length,
            senseis: newRequests.map(r => r.sensei_name),
            isFollowUp: true
          });
        }
      }
    }

    console.log(`Backup requirements check completed. Actions taken: ${actionsCount}`);

    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${tripsNeedingBackup?.length || 0} trips needing backup senseis`,
      actions: actionsCount,
      results
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error in check-backup-requirements function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

serve(handler);