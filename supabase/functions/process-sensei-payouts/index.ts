
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

    // Get payout settings using the new RPC
    const { data: payoutSettings, error: settingsError } = await supabaseServiceClient
      .rpc("get_payout_settings");

    if (settingsError || !payoutSettings) {
      throw new Error("Payout settings not configured");
    }

    const senseiLevel = trip.sensei_profiles.sensei_level;
    const senseiCommission = payoutSettings.sensei_commission_percents?.[senseiLevel] || 80;
    const platformCommission = payoutSettings.platform_commission_percents?.[senseiLevel] || 20;
    const advancePercent = payoutSettings.advance_payout_percents?.[senseiLevel] || 0;
    const day1Percent = payoutSettings.day1_payout_percents?.[senseiLevel] || 40;

    // Check if Sensei has Stripe Connect set up
    if (!trip.sensei_profiles.stripe_account_id || trip.sensei_profiles.stripe_connect_status !== "complete") {
      throw new Error("Sensei Stripe Connect account not set up");
    }

    // Calculate amounts
    const tripPrice = parseFloat(trip.price);
    const totalSenseiCommission = Math.round(tripPrice * (senseiCommission / 100) * 100); // in cents
    const platformFee = Math.round(tripPrice * (platformCommission / 100) * 100); // in cents
    
    let payoutAmount = 0;
    let description = "";
    
    // Calculate payout amount based on type
    switch (payout_type) {
      case "advance":
        payoutAmount = Math.round(totalSenseiCommission * (advancePercent / 100));
        description = `Advance payout (${advancePercent}% of commission)`;
        
        // Check if trip has reached minimum participants
        if (trip.current_participants < trip.min_participants) {
          throw new Error("Trip has not reached minimum participants for advance payout");
        }
        break;
        
      case "day1":
        payoutAmount = Math.round(totalSenseiCommission * (day1Percent / 100));
        description = `Day 1 payout (${day1Percent}% of commission)`;
        
        // Check if trip has started (start_date should be today or in the past)
        const tripStartDate = new Date(trip.start_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        tripStartDate.setHours(0, 0, 0, 0);
        
        if (tripStartDate > today) {
          throw new Error("Trip has not started yet for Day 1 payout");
        }
        break;
        
      case "final":
        // Calculate final amount after subtracting previous payouts
        const { data: previousPayouts } = await supabaseServiceClient
          .from("sensei_payouts")
          .select("net_amount")
          .eq("trip_id", trip_id)
          .eq("status", "paid")
          .in("payout_type", ["advance", "day1"]);

        const totalPaid = previousPayouts?.reduce((sum, payout) => sum + payout.net_amount, 0) || 0;
        payoutAmount = totalSenseiCommission - totalPaid;
        description = `Final payout (remaining ${100 - advancePercent - day1Percent}% of commission)`;
        
        // Check if trip has ended (7-14 days after end_date based on settings)
        const tripEndDate = new Date(trip.end_date);
        const delayDays = payoutSettings.payout_delay_days?.min || 7;
        const minPayoutDate = new Date(tripEndDate);
        minPayoutDate.setDate(minPayoutDate.getDate() + delayDays);
        
        if (new Date() < minPayoutDate) {
          throw new Error(`Final payout not available until ${delayDays} days after trip completion`);
        }
        break;
        
      default:
        throw new Error("Invalid payout type");
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
        gross_amount: totalSenseiCommission,
        platform_fee: platformFee,
        net_amount: payoutAmount,
        currency: "EUR",
        status: "processing",
        payout_type: payout_type,
        commission_percent: senseiCommission,
        advance_percent: payout_type === "advance" ? advancePercent : null,
        notes: description,
        metadata: {
          trip_title: trip.title,
          trip_price: tripPrice,
          sensei_level: senseiLevel,
          payout_stage: payout_type,
          platform_commission_percent: platformCommission
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
        sensei_id: trip.sensei_profiles.id,
        stage: payout_type
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

    console.log(`${payout_type} payout processed: ${payoutAmount / 100} EUR to ${trip.sensei_profiles.stripe_account_id}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        payout_id: payoutRecord.id,
        amount: payoutAmount / 100,
        transfer_id: transfer.id,
        stage: payout_type,
        description: description
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
