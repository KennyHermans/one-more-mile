
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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const supabaseServiceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the authenticated user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseClient.auth.getUser(token);
    
    if (!user?.email) {
      throw new Error("User not authenticated");
    }

    const { sensei_id } = await req.json();

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Get sensei profile
    const { data: senseiProfile, error: profileError } = await supabaseServiceClient
      .from("sensei_profiles")
      .select("*")
      .eq("id", sensei_id)
      .eq("user_id", user.id)
      .single();

    if (profileError || !senseiProfile) {
      throw new Error("Sensei profile not found");
    }

    let accountId = senseiProfile.stripe_account_id;

    // Create Stripe Connect account if it doesn't exist
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: user.email,
        capabilities: {
          transfers: { requested: true },
        },
        business_profile: {
          mcc: "7991", // Tourist guide services
          product_description: "Travel guide and educational services",
        },
      });

      accountId = account.id;

      // Update sensei profile with Stripe account ID
      await supabaseServiceClient
        .from("sensei_profiles")
        .update({ 
          stripe_account_id: accountId,
          stripe_connect_status: "pending"
        })
        .eq("id", sensei_id);
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${req.headers.get("origin")}/sensei/dashboard?stripe_refresh=true`,
      return_url: `${req.headers.get("origin")}/sensei/dashboard?stripe_complete=true`,
      type: "account_onboarding",
    });

    return new Response(
      JSON.stringify({ 
        account_link_url: accountLink.url,
        account_id: accountId 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error creating Stripe Connect account:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
