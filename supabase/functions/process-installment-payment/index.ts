import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-INSTALLMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Installment payment processing started");

    // Use service role key for database operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get payment plan ID from request
    const { paymentPlanId, manualTrigger } = await req.json();
    logStep("Request data received", { paymentPlanId, manualTrigger });

    // Get payment plan details
    const { data: paymentPlan, error: planError } = await supabaseClient
      .from('payment_plans')
      .select('*')
      .eq('id', paymentPlanId)
      .single();

    if (planError || !paymentPlan) throw new Error("Payment plan not found");
    logStep("Payment plan retrieved", { 
      planId: paymentPlan.id,
      paymentsCompleted: paymentPlan.payments_completed,
      installmentCount: paymentPlan.installment_count 
    });

    // Check if payment plan is complete
    if (paymentPlan.payments_completed >= paymentPlan.installment_count + 1) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Payment plan already completed" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Process the installment payment
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: paymentPlan.installment_amount,
        currency: "usd",
        customer: paymentPlan.stripe_customer_id,
        description: `Installment payment ${paymentPlan.payments_completed} for trip ${paymentPlan.trip_id}`,
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          payment_plan_id: paymentPlan.id,
          trip_id: paymentPlan.trip_id,
          user_id: paymentPlan.user_id,
          installment_number: paymentPlan.payments_completed.toString()
        }
      });

      logStep("Payment intent created", { paymentIntentId: paymentIntent.id });

      // Update payment plan
      const nextPaymentDate = paymentPlan.payments_completed < paymentPlan.installment_count 
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const isComplete = paymentPlan.payments_completed + 1 >= paymentPlan.installment_count + 1;

      const { error: updateError } = await supabaseClient
        .from('payment_plans')
        .update({
          payments_completed: paymentPlan.payments_completed + 1,
          next_payment_date: nextPaymentDate,
          status: isComplete ? "completed" : "active",
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentPlan.id);

      if (updateError) throw updateError;

      // If payment plan is complete, update booking status
      if (isComplete) {
        const { error: bookingUpdateError } = await supabaseClient
          .from('trip_bookings')
          .update({
            payment_status: "paid",
            booking_status: "confirmed",
            updated_at: new Date().toISOString()
          })
          .eq('id', paymentPlan.booking_id);

        if (bookingUpdateError) throw bookingUpdateError;
        logStep("Booking status updated to confirmed");
      }

      logStep("Payment plan updated successfully");

      return new Response(JSON.stringify({ 
        success: true,
        payment_intent_id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        payment_completed: isComplete,
        remaining_payments: Math.max(0, paymentPlan.installment_count + 1 - (paymentPlan.payments_completed + 1))
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } catch (stripeError) {
      logStep("Stripe payment failed", { error: stripeError });
      
      // Record failed payment attempt
      const { error: failureError } = await supabaseClient
        .from('payment_failures')
        .insert({
          payment_plan_id: paymentPlan.id,
          user_id: paymentPlan.user_id,
          amount: paymentPlan.installment_amount,
          failure_reason: stripeError instanceof Error ? stripeError.message : "Unknown error",
          attempted_at: new Date().toISOString()
        });

      if (failureError) console.error("Failed to record payment failure:", failureError);

      throw stripeError;
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in process-installment-payment", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});