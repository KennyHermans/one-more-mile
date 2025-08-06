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

    console.log('Testing backup system functionality...');

    // Step 1: Create a test trip that requires backup
    const { data: testTrip, error: tripError } = await supabase
      .from('trips')
      .insert({
        title: 'Test High-Value Expedition',
        description: 'A test expedition to verify backup sensei functionality',
        theme: 'Mountain Climbing',
        destination: 'Everest Base Camp, Nepal',
        dates: 'June 15-30, 2024',
        price: '$3,500',
        difficulty_level: 'Expert',
        max_participants: 8,
        current_participants: 2,
        group_size: '6-8',
        trip_status: 'approved',
        sensei_id: (await supabase.from('sensei_profiles').select('id').limit(1)).data?.[0]?.id,
        is_active: true,
        requires_backup_sensei: true,
        backup_assignment_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    if (tripError) {
      console.error('Error creating test trip:', tripError);
      return new Response(JSON.stringify({ error: tripError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Created test trip:', testTrip.title);

    // Step 2: Test the backup request system
    const { data: backupRequests, error: backupError } = await supabase
      .rpc('request_backup_senseis', {
        p_trip_id: testTrip.id,
        p_max_requests: 2
      });

    if (backupError) {
      console.error('Error requesting backup senseis:', backupError);
    } else {
      console.log(`Created ${backupRequests?.length || 0} backup requests`);
    }

    // Step 3: Test the check-backup-requirements function
    const { data: checkResult, error: checkError } = await supabase.functions.invoke('check-backup-requirements');
    
    if (checkError) {
      console.error('Error in check-backup-requirements:', checkError);
    } else {
      console.log('Check backup requirements result:', checkResult);
    }

    // Step 4: Get system status
    const { data: automationSettings } = await supabase
      .from('payment_settings')
      .select('setting_name, setting_value')
      .in('setting_name', [
        'backup_automation_enabled',
        'backup_request_timeout_hours',
        'backup_max_retry_attempts'
      ]);

    const { data: pendingRequests } = await supabase
      .from('backup_sensei_requests')
      .select('count')
      .eq('status', 'pending');

    const { data: tripsNeedingBackup } = await supabase
      .from('trips')
      .select('count')
      .eq('requires_backup_sensei', true)
      .is('backup_sensei_id', null);

    return new Response(JSON.stringify({
      success: true,
      message: 'Backup system test completed',
      results: {
        test_trip_created: testTrip.title,
        backup_requests_sent: backupRequests?.length || 0,
        automation_settings: automationSettings,
        pending_requests: pendingRequests,
        trips_needing_backup: tripsNeedingBackup,
        check_function_result: checkResult
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error in test-backup-system function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

serve(handler);