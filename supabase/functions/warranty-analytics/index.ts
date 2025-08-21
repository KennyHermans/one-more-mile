import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get warranty analytics data
    const currentDate = new Date();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

    // Get total active warranty methods
    const { data: activeWarranties, error: warrantiesError } = await supabaseClient
      .from("sensei_warranty_methods")
      .select("id")
      .eq("is_active", true);

    if (warrantiesError) throw warrantiesError;

    // Get charges this month
    const { data: monthlyCharges, error: chargesError } = await supabaseClient
      .from("sensei_warranty_charges")
      .select("amount")
      .gte("created_at", firstDayOfMonth.toISOString())
      .eq("status", "succeeded");

    if (chargesError) throw chargesError;

    // Calculate metrics
    const totalActiveWarranties = activeWarranties?.length || 0;
    const totalChargesThisMonth = monthlyCharges?.reduce((sum, charge) => sum + (charge.amount / 100), 0) || 0;
    const averageChargeAmount = monthlyCharges?.length 
      ? Math.round(totalChargesThisMonth / monthlyCharges.length) 
      : 0;

    // Get recent warranty activity
    const { data: recentActivity, error: activityError } = await supabaseClient
      .from("sensei_warranty_charges")
      .select(`
        id,
        amount,
        reason,
        status,
        created_at,
        sensei_profiles!inner(name),
        trips(title)
      `)
      .order("created_at", { ascending: false })
      .limit(10);

    if (activityError) throw activityError;

    // Get warranty setup completion rate
    const { data: totalSenseis, error: senseisError } = await supabaseClient
      .from("sensei_profiles")
      .select("id")
      .eq("is_active", true);

    if (senseisError) throw senseisError;

    const setupCompletionRate = totalSenseis?.length 
      ? Math.round((totalActiveWarranties / totalSenseis.length) * 100)
      : 0;

    // Get monthly trends (last 6 months)
    const monthlyTrends = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 0);
      
      const { data: monthCharges } = await supabaseClient
        .from("sensei_warranty_charges")
        .select("amount")
        .gte("created_at", monthStart.toISOString())
        .lte("created_at", monthEnd.toISOString())
        .eq("status", "succeeded");

      const monthTotal = monthCharges?.reduce((sum, charge) => sum + (charge.amount / 100), 0) || 0;
      
      monthlyTrends.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        amount: monthTotal,
        count: monthCharges?.length || 0
      });
    }

    const analytics = {
      totalActiveWarranties,
      totalChargesThisMonth: Math.round(totalChargesThisMonth),
      averageChargeAmount,
      senseisCovered: totalActiveWarranties,
      setupCompletionRate,
      recentActivity: recentActivity?.map(activity => ({
        ...activity,
        sensei_name: activity.sensei_profiles.name,
        trip_title: activity.trips?.title,
        amount_euros: activity.amount / 100
      })),
      monthlyTrends,
      lastUpdated: new Date().toISOString()
    };

    return new Response(
      JSON.stringify(analytics),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error fetching warranty analytics:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});