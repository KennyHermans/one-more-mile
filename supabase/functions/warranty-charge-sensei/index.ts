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
    const { sensei_id, amount, reason } = await req.json();
    console.log("Processing warranty charge:", { sensei_id, amount, reason });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get authenticated user and verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error("User not authenticated");
    }

    // Verify admin role
    const { data: adminRole } = await supabaseClient
      .from("admin_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("is_active", true)
      .single();

    if (!adminRole) {
      throw new Error("Admin access required");
    }

    // Get warranty settings
    const { data: warrantySettings } = await supabaseClient
      .rpc("get_warranty_settings");

    const maxAmount = warrantySettings?.max_amount?.amount || 50000; // Default €500

    if (amount > maxAmount) {
      throw new Error(`Amount exceeds maximum warranty limit of ${maxAmount / 100}€`);
    }

    // Get active warranty method for sensei
    const { data: warrantyMethod, error: methodError } = await supabaseClient
      .from("sensei_warranty_methods")
      .select("*")
      .eq("sensei_id", sensei_id)
      .eq("is_active", true)
      .single();

    if (methodError || !warrantyMethod) {
      throw new Error("No active warranty method found for this sensei");
    }

    console.log("Found warranty method:", warrantyMethod.id);

    // Create payment intent with saved payment method
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: "eur",
      customer: warrantyMethod.stripe_payment_method_id.startsWith('pm_') 
        ? undefined 
        : warrantyMethod.stripe_payment_method_id,
      payment_method: warrantyMethod.stripe_payment_method_id,
      confirm: true,
      off_session: true,
      description: `Warranty charge: ${reason}`,
      metadata: {
        sensei_id: sensei_id,
        warranty_method_id: warrantyMethod.id,
        charged_by_admin: userData.user.id,
        reason: reason,
      },
    });

    console.log("Created payment intent:", paymentIntent.id);

    // Save charge record
    const { data: chargeRecord, error: chargeError } = await supabaseClient
      .from("sensei_warranty_charges")
      .insert({
        sensei_id: sensei_id,
        warranty_method_id: warrantyMethod.id,
        stripe_payment_intent_id: paymentIntent.id,
        amount_charged: amount,
        currency: "eur",
        charge_reason: reason,
        charged_by_admin: userData.user.id,
        charge_status: paymentIntent.status,
      })
      .select()
      .single();

    if (chargeError) {
      console.error("Error saving charge record:", chargeError);
      throw new Error("Failed to save charge record");
    }

    console.log("Saved charge record:", chargeRecord.id);

    return new Response(JSON.stringify({ 
      success: true,
      payment_intent_id: paymentIntent.id,
      charge_id: chargeRecord.id,
      status: paymentIntent.status
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in warranty-charge-sensei:", error);
    
    // If it's a Stripe error, save the failure
    if (error.type === "StripeCardError") {
      // Try to save the failed charge record if we have the necessary info
      // This would need additional error handling logic
    }

    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});