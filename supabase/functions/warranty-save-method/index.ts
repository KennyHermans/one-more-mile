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
    const { setup_intent_id } = await req.json();
    console.log("Saving warranty method for setup intent:", setup_intent_id);

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

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error("User not authenticated");
    }

    // Get sensei profile
    const { data: senseiProfile, error: senseiError } = await supabaseClient
      .from("sensei_profiles")
      .select("id")
      .eq("user_id", userData.user.id)
      .single();

    if (senseiError || !senseiProfile) {
      throw new Error("Sensei profile not found");
    }

    // Retrieve the setup intent to get payment method
    const setupIntent = await stripe.setupIntents.retrieve(setup_intent_id);
    
    if (setupIntent.status !== 'succeeded' || !setupIntent.payment_method) {
      throw new Error("Setup intent not completed successfully");
    }

    console.log("Setup intent succeeded:", setupIntent.id);

    // Get payment method details
    const paymentMethod = await stripe.paymentMethods.retrieve(setupIntent.payment_method as string);
    
    if (!paymentMethod.card) {
      throw new Error("No card information found");
    }

    console.log("Retrieved payment method:", paymentMethod.id);

    // Deactivate existing warranty methods for this sensei
    await supabaseClient
      .from("sensei_warranty_methods")
      .update({ is_active: false })
      .eq("sensei_id", senseiProfile.id)
      .eq("is_active", true);

    // Save new warranty method
    const { data: warrantyMethod, error: insertError } = await supabaseClient
      .from("sensei_warranty_methods")
      .insert({
        sensei_id: senseiProfile.id,
        stripe_setup_intent_id: setup_intent_id,
        stripe_payment_method_id: paymentMethod.id,
        card_brand: paymentMethod.card.brand,
        card_last4: paymentMethod.card.last4,
        card_exp_month: paymentMethod.card.exp_month,
        card_exp_year: paymentMethod.card.exp_year,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting warranty method:", insertError);
      throw new Error("Failed to save warranty method");
    }

    console.log("Saved warranty method:", warrantyMethod.id);

    return new Response(JSON.stringify({ 
      success: true,
      warranty_method: warrantyMethod
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in warranty-save-method:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});