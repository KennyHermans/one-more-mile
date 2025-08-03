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
  console.log(`[HANDLE-PAYMENT-SUCCESS] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Payment success handler started");

    // Use service role key for database operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get session ID from request
    const { sessionId } = await req.json();
    logStep("Session ID received", { sessionId });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    logStep("Stripe session retrieved", { 
      sessionId: session.id, 
      paymentStatus: session.payment_status,
      metadata: session.metadata 
    });

    if (session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }

    const { trip_id, user_id, payment_type, plan_type, total_amount, installment_amount, installment_count } = session.metadata || {};

    if (!trip_id || !user_id) {
      throw new Error("Missing required metadata");
    }

    // Create trip booking
    const bookingData = {
      trip_id,
      user_id,
      total_amount: payment_type === "full_payment" ? session.amount_total : parseInt(total_amount || "0"),
      payment_status: payment_type === "full_payment" ? "paid" : "partial",
      booking_status: payment_type === "full_payment" ? "confirmed" : "reserved",
      booking_date: new Date().toISOString()
    };

    const { data: booking, error: bookingError } = await supabaseClient
      .from('trip_bookings')
      .insert(bookingData)
      .select()
      .single();

    if (bookingError) throw bookingError;
    logStep("Booking created", { bookingId: booking.id });

    // If installment plan, create payment schedule
    if (payment_type === "deposit" && plan_type && installment_amount && installment_count) {
      logStep("Creating payment schedule for installments");
      
      // Create customer profile
      const { error: profileError } = await supabaseClient
        .from('customer_profiles')
        .upsert({
          user_id,
          updated_at: new Date().toISOString()
        });

      if (profileError) console.error("Profile upsert error:", profileError);

      // Create payment plan record
      const paymentPlan = {
        booking_id: booking.id,
        user_id,
        trip_id,
        total_amount: parseInt(total_amount),
        deposit_amount: session.amount_total || 0,
        installment_amount: parseInt(installment_amount),
        installment_count: parseInt(installment_count),
        payments_completed: 1, // Deposit is complete
        plan_type,
        status: "active",
        next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        stripe_customer_id: session.customer as string,
        created_at: new Date().toISOString()
      };

      const { error: planError } = await supabaseClient
        .from('payment_plans')
        .insert(paymentPlan);

      if (planError) throw planError;
      logStep("Payment plan created", { planType: plan_type });

      // Create scheduled payment reminders
      for (let i = 1; i <= parseInt(installment_count); i++) {
        const paymentDate = new Date(Date.now() + (i * 30 * 24 * 60 * 60 * 1000));
        
        const reminderData = {
          user_id,
          trip_id,
          booking_id: booking.id,
          reminder_type: "payment_due",
          scheduled_date: paymentDate.toISOString(),
          message: `Payment ${i + 1} of ${parseInt(installment_count) + 1} is due for your ${trip_id} trip`,
          is_sent: false,
          created_at: new Date().toISOString()
        };

        await supabaseClient
          .from('payment_reminders')
          .insert(reminderData);
      }
      logStep("Payment reminders scheduled");
    }

    // Create default todos for the customer
    const defaultTodos = [
      { title: "Complete passport verification", description: "Upload a clear photo of your passport", due_date: null, created_by_admin: true },
      { title: "Submit travel insurance details", description: "Provide proof of travel insurance coverage", due_date: null, created_by_admin: true },
      { title: "Add emergency contact details", description: "Complete your emergency contact information", due_date: null, created_by_admin: true },
      { title: "Update dietary restrictions", description: "Let us know about any dietary restrictions or allergies", due_date: null, created_by_admin: true }
    ];

    const todoInserts = defaultTodos.map(todo => ({
      user_id,
      trip_id,
      ...todo
    }));

    const { error: todoError } = await supabaseClient
      .from('customer_todos')
      .insert(todoInserts);

    if (todoError) console.error("Todo creation error:", todoError);
    logStep("Customer todos created");

    return new Response(JSON.stringify({ 
      success: true,
      booking_id: booking.id,
      payment_type,
      message: payment_type === "full_payment" 
        ? "Payment successful! Your trip is confirmed." 
        : "Deposit received! Your trip is reserved and payment plan is active."
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in handle-payment-success", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});