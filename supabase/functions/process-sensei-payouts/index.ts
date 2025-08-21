
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
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
    const supabaseServiceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const { trip_id, payout_type = "final" } = await req.json();

    // Get trip details
    const { data: trip, error: tripError } = await supabaseServiceClient
      .from("trips")
      .select(`
        *,
        sensei_profiles!inner(
          id,
          sensei_level,
          stripe_account_id,
          stripe_connect_status
        )
      `)
      .eq("id", trip_id)
      .single();

    if (tripError || !trip) {
      throw new Error("Trip not found");
    }

    // Get payment settings
    const { data: settings } = await supabaseServiceClient
      .from("payment_settings")
      .select("*")
      .in("setting_name", ["sensei_commission_percents", "advance_payout_percents"])
      .order("created_at", { ascending: false });

    const commissionSettings = settings?.find(s => s.setting_name === "sensei_commission_percents")?.setting_value;
    const advanceSettings = settings?.find(s => s.setting_name === "advance_payout_percents")?.setting_value;

    if (!commissionSettings || !advanceSettings) {
      throw new Error("Payment settings not configured");
    }

    const senseiLevel = trip.sensei_profiles.sensei_level;
    const commissionPercent = commissionSettings[senseiLevel] || 80;
    const advancePercent = advanceSettings[senseiLevel] || 0;

    // Check if Sensei has Stripe Connect set up
    if (!trip.sensei_profiles.stripe_account_id || trip.sensei_profiles.stripe_connect_status !== "complete") {
      throw new Error("Sensei Stripe Connect account not set up");
    }

    // Calculate amounts
    const tripPrice = parseFloat(trip.price);
    const totalCommission = Math.round(tripPrice * (commissionPercent / 100) * 100); // in cents
    
    let payoutAmount = totalCommission;
    
    if (payout_type === "advance") {
      payoutAmount = Math.round(totalCommission * (advancePercent / 100));
      
      // Check if trip has reached minimum participants
      if (trip.current_participants < trip.min_participants) {
        throw new Error("Trip has not reached minimum participants for advance payout");
      }
    } else if (payout_type === "final") {
      // Check if advance was already paid
      const { data: existingAdvance } = await supabaseServiceClient
        .from("sensei_payouts")
        .select("net_amount")
        .eq("trip_id", trip_id)
        .eq("payout_type", "advance")
        .eq("status", "paid");

      const advancePaid = existingAdvance?.reduce((sum, payout) => sum + payout.net_amount, 0) || 0;
      payoutAmount = totalCommission - advancePaid;
    }

    if (payoutAmount <= 0) {
      throw new Error("No payout amount due");
    }

    // Create payout record
    const { data: payoutRecord, error: payoutError } = await supabaseServiceClient
      .from("sensei_payouts")
      .insert({
        sensei_id: trip.sensei_profiles.id,
        trip_id: trip_id,
        gross_amount: totalCommission,
        platform_fee: Math.round(tripPrice * 100) - totalCommission,
        net_amount: payoutAmount,
        currency: "EUR",
        status: "processing",
        payout_type: payout_type,
        commission_percent: commissionPercent,
        advance_percent: payout_type === "advance" ? advancePercent : null,
        metadata: {
          trip_title: trip.title,
          trip_price: tripPrice,
          sensei_level: senseiLevel
        }
      })
      .select()
      .single();

    if (payoutError) {
      throw new Error("Failed to create payout record");
    }

    // Process Stripe transfer
    const transfer = await stripe.transfers.create({
      amount: payoutAmount,
      currency: "eur",
      destination: trip.sensei_profiles.stripe_account_id,
      metadata: {
        payout_id: payoutRecord.id,
        trip_id: trip_id,
        payout_type: payout_type,
        sensei_id: trip.sensei_profiles.id
      }
    });

    // Update payout record with Stripe transfer ID
    await supabaseServiceClient
      .from("sensei_payouts")
      .update({ 
        status: "paid",
        paid_at: new Date().toISOString(),
        metadata: {
          ...payoutRecord.metadata,
          stripe_transfer_id: transfer.id
        }
      })
      .eq("id", payoutRecord.id);

    console.log(`Payout processed: ${payoutAmount / 100} EUR to ${trip.sensei_profiles.stripe_account_id}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        payout_id: payoutRecord.id,
        amount: payoutAmount / 100,
        transfer_id: transfer.id
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error processing payout:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
      }
    );
  }
});
