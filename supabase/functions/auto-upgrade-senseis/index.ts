import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AutoUpgradeResult {
  success: boolean;
  upgrades_performed: number;
  timestamp: string;
  total_senseis_checked: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🚀 Starting automated sensei level upgrade process...');

    // Call the enhanced auto-upgrade function
    const { data: upgradeResult, error: upgradeError } = await supabase
      .rpc('enhanced_auto_upgrade_sensei_levels');

    if (upgradeError) {
      console.error('❌ Error during auto-upgrade:', upgradeError);
      throw upgradeError;
    }

    const result = upgradeResult as AutoUpgradeResult;
    
    console.log('✅ Auto-upgrade completed:', {
      upgrades_performed: result.upgrades_performed,
      total_checked: result.total_senseis_checked,
      timestamp: result.timestamp
    });

    // Log to admin audit table for tracking
    const { error: auditError } = await supabase
      .from('admin_audit_log')
      .insert({
        admin_user_id: null, // System operation
        action: 'automated_level_upgrade',
        table_name: 'sensei_profiles',
        record_id: null,
        old_values: null,
        new_values: {
          upgrades_performed: result.upgrades_performed,
          total_checked: result.total_senseis_checked,
          execution_time: result.timestamp
        }
      });

    if (auditError) {
      console.warn('⚠️ Failed to log audit entry:', auditError);
    }

    // If any upgrades were performed, check for milestone achievements
    if (result.upgrades_performed > 0) {
      console.log(`🎯 Processing milestone achievements for ${result.upgrades_performed} upgraded senseis...`);
      
      // Get all active senseis to check milestones
      const { data: senseis, error: senseisError } = await supabase
        .from('sensei_profiles')
        .select('id')
        .eq('is_active', true);

      if (!senseisError && senseis) {
        for (const sensei of senseis) {
          const { error: milestoneError } = await supabase
            .rpc('check_and_award_milestones', { p_sensei_id: sensei.id });
          
          if (milestoneError) {
            console.warn(`⚠️ Failed to check milestones for sensei ${sensei.id}:`, milestoneError);
          }
        }
      }
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: `Auto-upgrade completed successfully. ${result.upgrades_performed} senseis upgraded.`,
        data: result
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('💥 Fatal error in auto-upgrade process:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});