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
    console.log("Starting warranty setup intent creation");

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
      .select("id, name")
      .eq("user_id", userData.user.id)
      .single();

    if (senseiError || !senseiProfile) {
      throw new Error("Sensei profile not found");
    }

    console.log("Found sensei profile:", senseiProfile.id);

    // Check for existing Stripe customer
    const customers = await stripe.customers.list({ 
      email: userData.user.email, 
      limit: 1 
    });

    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log("Found existing customer:", customerId);
    } else {
      // Create new customer
      const customer = await stripe.customers.create({
        email: userData.user.email,
        name: senseiProfile.name,
        metadata: {
          sensei_id: senseiProfile.id,
          user_id: userData.user.id,
        },
      });
      customerId = customer.id;
      console.log("Created new customer:", customerId);
    }

    // Create SetupIntent for warranty
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      usage: "off_session",
      metadata: {
        purpose: "warranty",
        sensei_id: senseiProfile.id,
      },
    });

    console.log("Created setup intent:", setupIntent.id);

    return new Response(JSON.stringify({ 
      client_secret: setupIntent.client_secret,
      setup_intent_id: setupIntent.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in warranty-create-setup-intent:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});