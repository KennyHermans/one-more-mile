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
  console.log(`[CREATE-PAYMENT-PLAN] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Payment plan creation started");

    // Create Supabase client using the anon key for user authentication
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get request body
    const { tripId, planType, fullPayment } = await req.json();
    logStep("Request data received", { tripId, planType, fullPayment });

    // Retrieve authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError) throw new Error(`Authentication error: ${authError.message}`);
    
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get trip details
    const { data: trip, error: tripError } = await supabaseClient
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (tripError || !trip) throw new Error("Trip not found");
    logStep("Trip details retrieved", { tripTitle: trip.title, price: trip.price });

    // Extract price as number (remove currency symbols and convert to cents)
    const priceString = trip.price.replace(/[^0-9.]/g, '');
    const totalAmountDollars = parseFloat(priceString);
    const totalAmountCents = Math.round(totalAmountDollars * 100);
    
    // Default to EUR currency (all trips now use Euro)
    const currency = 'eur';
    logStep("Price calculation", { totalAmountDollars, totalAmountCents, currency });

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not configured");
    
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });
    logStep("Stripe initialized");

    // Check if a Stripe customer record exists for this user
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      logStep("No existing customer found");
    }

    let session;

    if (fullPayment) {
      // Create one-time payment session
      logStep("Creating full payment session");
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        line_items: [
          {
            price_data: {
              currency: currency,
              product_data: { 
                name: `${trip.title} - Full Payment`,
                description: `Complete payment for ${trip.destination} trip`
              },
              unit_amount: totalAmountCents,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${req.headers.get("origin")}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.get("origin")}/trip/${tripId}`,
        metadata: {
          trip_id: tripId,
          user_id: user.id,
          payment_type: "full_payment"
        }
      });
    } else {
      // Create installment payment plan
      let depositAmount, installmentAmount, installmentCount;
      
      if (planType === "deposit_1000") {
        // €1000 deposit (all prices are now in EUR)
        const depositAmountValue = 1000;
        depositAmount = depositAmountValue * 100; // Convert to cents
        installmentAmount = totalAmountCents - depositAmount;
        installmentCount = 1;
      } else {
        throw new Error("Invalid payment plan type");
      }

      logStep("Payment plan calculated", { 
        depositAmount, 
        installmentAmount, 
        installmentCount,
        planType 
      });

      // Create deposit payment session
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        line_items: [
          {
            price_data: {
              currency: currency,
              product_data: { 
                name: `${trip.title} - Deposit Payment`,
                description: `Deposit for ${trip.destination} trip (${planType.replace('_', ' ')} plan)`
              },
              unit_amount: depositAmount,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${req.headers.get("origin")}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.get("origin")}/trip/${tripId}`,
        metadata: {
          trip_id: tripId,
          user_id: user.id,
          payment_type: "deposit",
          plan_type: planType,
          total_amount: totalAmountCents.toString(),
          installment_amount: installmentAmount.toString(),
          installment_count: installmentCount.toString()
        }
      });
    }

    logStep("Checkout session created successfully", { sessionId: session.id });

    return new Response(JSON.stringify({ 
      url: session.url,
      sessionId: session.id 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-payment-plan", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});