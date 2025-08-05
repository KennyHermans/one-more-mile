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

    console.log('Starting automated backup assignment scan...');

    // Get automation settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('payment_settings')
      .select('setting_value')
      .eq('setting_name', 'automated_backup_assignment')
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') {
      console.error('Error fetching settings:', settingsError);
      return new Response(JSON.stringify({ error: settingsError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const settings = settingsData?.setting_value || {
      enabled: true,
      maxRequestsPerTrip: 3,
      responseTimeoutHours: 72,
      minMatchScore: 60,
      retryAfterHours: 24,
      escalateAfterRetries: 2
    };

    if (!settings.enabled) {
      console.log('Automation is disabled, skipping scan');
      return new Response(JSON.stringify({
        success: true,
        message: 'Automation disabled'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Automation settings:', settings);

    // 1. Mark expired backup requests as expired
    const expiredDeadline = new Date();
    expiredDeadline.setHours(expiredDeadline.getHours() - settings.responseTimeoutHours);

    const { error: expiredError, count: expiredCount } = await supabase
      .from('backup_sensei_requests')
      .update({ status: 'expired' })
      .eq('status', 'pending')
      .lt('response_deadline', expiredDeadline.toISOString())
      .select('*', { count: 'exact' });

    if (expiredError) {
      console.error('Error marking expired requests:', expiredError);
    } else {
      console.log(`Marked ${expiredCount} requests as expired`);
    }

    // 2. Find trips that need backup senseis
    const { data: tripsNeedingBackup, error: tripsError } = await supabase
      .from('trips')
      .select(`
        id,
        title,
        theme,
        dates,
        trip_status,
        requires_backup_sensei,
        backup_sensei_id,
        backup_assignment_deadline
      `)
      .eq('trip_status', 'approved')
      .eq('requires_backup_sensei', true)
      .is('backup_sensei_id', null);

    if (tripsError) {
      console.error('Error fetching trips:', tripsError);
      return new Response(JSON.stringify({ error: tripsError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Found ${tripsNeedingBackup?.length || 0} trips needing backup`);

    let processedTrips = 0;
    let requestsSent = 0;
    let escalatedAlerts = 0;

    for (const trip of tripsNeedingBackup || []) {
      try {
        // Check if we've already sent requests for this trip recently
        const retryDeadline = new Date();
        retryDeadline.setHours(retryDeadline.getHours() - settings.retryAfterHours);

        const { data: recentRequests, error: recentError } = await supabase
          .from('backup_sensei_requests')
          .select('id, status, requested_at')
          .eq('trip_id', trip.id)
          .gte('requested_at', retryDeadline.toISOString());

        if (recentError) {
          console.error(`Error checking recent requests for trip ${trip.id}:`, recentError);
          continue;
        }

        const totalAttempts = recentRequests?.length || 0;
        const pendingRequests = recentRequests?.filter(r => r.status === 'pending').length || 0;

        // Skip if we have pending requests or exceeded retry limit
        if (pendingRequests > 0) {
          console.log(`Trip ${trip.id} has ${pendingRequests} pending requests, skipping`);
          continue;
        }

        if (totalAttempts >= settings.escalateAfterRetries) {
          // Escalate to admin alert
          const { error: alertError } = await supabase
            .from('admin_alerts')
            .insert({
              alert_type: 'backup_escalation',
              priority: 'critical',
              title: `Critical: Backup Assignment Failed for ${trip.title}`,
              message: `Trip "${trip.title}" has failed ${totalAttempts} backup assignment attempts. Manual intervention required.`,
              trip_id: trip.id,
              metadata: {
                total_attempts: totalAttempts,
                escalation_reason: 'max_retries_exceeded'
              }
            });

          if (alertError) {
            console.error(`Error creating escalation alert for trip ${trip.id}:`, alertError);
          } else {
            escalatedAlerts++;
            console.log(`Escalated trip ${trip.id} to admin alert`);
          }
          continue;
        }

        // Send backup requests using the existing RPC function
        const { data: requestResults, error: rpcError } = await supabase.rpc('request_backup_senseis', {
          p_trip_id: trip.id,
          p_max_requests: settings.maxRequestsPerTrip
        });

        if (rpcError) {
          console.error(`Error requesting backup for trip ${trip.id}:`, rpcError);
          
          // Create alert for RPC failure
          await supabase
            .from('admin_alerts')
            .insert({
              alert_type: 'backup_request_failed',
              priority: 'high',
              title: `Backup Request Failed: ${trip.title}`,
              message: `Failed to send automated backup requests for trip "${trip.title}". Error: ${rpcError.message}`,
              trip_id: trip.id,
              metadata: { error: rpcError.message }
            });
        } else {
          const requestCount = Array.isArray(requestResults) ? requestResults.length : 0;
          requestsSent += requestCount;
          console.log(`Sent ${requestCount} backup requests for trip ${trip.id}`);
        }

        processedTrips++;
      } catch (error) {
        console.error(`Error processing trip ${trip.id}:`, error);
      }
    }

    // 3. Check for trips approaching their backup deadline
    const warningDeadline = new Date();
    warningDeadline.setHours(warningDeadline.getHours() + 24); // 24 hours before deadline

    const { data: tripsNearDeadline, error: deadlineError } = await supabase
      .from('trips')
      .select(`
        id,
        title,
        backup_assignment_deadline
      `)
      .eq('trip_status', 'approved')
      .eq('requires_backup_sensei', true)
      .is('backup_sensei_id', null)
      .not('backup_assignment_deadline', 'is', null)
      .lt('backup_assignment_deadline', warningDeadline.toISOString());

    if (!deadlineError && tripsNearDeadline && tripsNearDeadline.length > 0) {
      for (const trip of tripsNearDeadline) {
        await supabase
          .from('admin_alerts')
          .insert({
            alert_type: 'backup_deadline_warning',
            priority: 'high',
            title: `Backup Deadline Approaching: ${trip.title}`,
            message: `Trip "${trip.title}" backup assignment deadline is within 24 hours. No backup sensei assigned yet.`,
            trip_id: trip.id,
            metadata: {
              deadline: trip.backup_assignment_deadline
            }
          });
      }
    }

    const summary = {
      success: true,
      message: 'Automated backup assignment scan completed',
      stats: {
        processed_trips: processedTrips,
        requests_sent: requestsSent,
        escalated_alerts: escalatedAlerts,
        expired_requests: expiredCount || 0,
        trips_near_deadline: tripsNearDeadline?.length || 0
      }
    };

    console.log('Scan completed:', summary);

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error in automated backup assignment:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

serve(handler);