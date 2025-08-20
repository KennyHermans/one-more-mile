import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://ce31f3af-8b91-484e-98ed-813aa571c1cc.sandbox.lovable.dev",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    logStep("Payment success handler started");

    // Input validation
    const body = await req.json();
    const { sessionId } = body;
    
    if (!sessionId || typeof sessionId !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid session ID' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Sanitize session ID
    const cleanSessionId = sessionId.trim().substring(0, 200);
    logStep("Session ID received", { sessionId: cleanSessionId });

    // Use service role key for database operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Initialize Stripe with error handling
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("Stripe secret key not configured");
    }
    
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    // Retrieve the checkout session with validation
    const session = await stripe.checkout.sessions.retrieve(cleanSessionId);
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

    // Send booking confirmation email via Resend
    try {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        const resend = new Resend(resendKey);
        // Fetch trip details for email context
        const { data: trip } = await supabaseClient
          .from('trips')
          .select('title, destination, dates, price')
          .eq('id', trip_id)
          .maybeSingle();

        const toEmail = (session.customer_details && session.customer_details.email) || (session as any).customer_email;
        const title = trip?.title || 'Your Adventure';
        const html = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, Arial, sans-serif; color:#111;">
            <h1 style="margin:0 0 8px;">Booking Confirmed</h1>
            <p style="margin:0 0 16px;">Thank you for your ${payment_type === 'full_payment' ? 'payment' : 'deposit'}! Your booking is ${payment_type === 'full_payment' ? 'confirmed' : 'reserved'}.</p>
            <div style="border:1px solid #e5e7eb; border-radius:8px; padding:16px;">
              <h2 style="margin:0 0 8px;">${title}</h2>
              ${trip?.destination ? `<p style=\"margin:0 0 4px;\"><strong>Destination:</strong> ${trip.destination}</p>` : ''}
              ${trip?.dates ? `<p style=\"margin:0 0 4px;\"><strong>Dates:</strong> ${trip.dates}</p>` : ''}
              ${trip?.price ? `<p style=\"margin:0 0 4px;\"><strong>Price:</strong> ${trip.price} per person</p>` : ''}
              <p style="margin:8px 0 0;"><strong>Booking ID:</strong> ${booking.id}</p>
            </div>
            ${payment_type === 'deposit' ? `<p style=\"margin:16px 0 0;\">Your payment plan is active. We\'ll send reminders before each due date.</p>` : ''}
            <p style="margin:16px 0 0; color:#6b7280; font-size:12px;">If you have questions, just reply to this email.</p>
          </div>
        `;

        if (toEmail) {
          await resend.emails.send({
            from: "One More Mile <onboarding@resend.dev>",
            to: [toEmail],
            subject: `${payment_type === 'full_payment' ? 'Booking confirmed' : 'Deposit received'}: ${title}`,
            html,
          });
          logStep('Confirmation email sent');
        } else {
          logStep('No recipient email found on session');
        }
      } else {
        logStep('RESEND_API_KEY not configured, skipping email');
      }
    } catch (emailErr) {
      console.error('Booking email send failed', emailErr);
    }

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