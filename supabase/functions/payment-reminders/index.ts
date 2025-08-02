import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import { Resend } from "npm:resend@2.0.0";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  console.log("Payment reminders function triggered");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get payment settings from database
    const { data: settings, error: settingsError } = await supabase
      .from('payment_settings')
      .select('setting_name, setting_value');

    if (settingsError) {
      console.error('Error fetching payment settings:', settingsError);
      throw settingsError;
    }

    // Parse settings
    const paymentDeadlineMonths = parseInt(settings?.find(s => s.setting_name === 'payment_deadline_months')?.setting_value || '3');
    const reminderIntervalsDays = settings?.find(s => s.setting_name === 'reminder_intervals_days')?.setting_value || [7, 3, 1];
    const reminderFrequencyHours = parseInt(settings?.find(s => s.setting_name === 'reminder_frequency_hours')?.setting_value || '24');
    const gracePeriodHours = parseInt(settings?.find(s => s.setting_name === 'grace_period_hours')?.setting_value || '24');

    console.log('Payment settings:', { paymentDeadlineMonths, reminderIntervalsDays, reminderFrequencyHours, gracePeriodHours });

    const now = new Date();
    const reminderFrequencyMs = reminderFrequencyHours * 60 * 60 * 1000;
    const gracePeriodMs = gracePeriodHours * 60 * 60 * 1000;

    // Find unpaid bookings that need reminders
    let upcomingDeadlines = [];
    
    for (const intervalDays of reminderIntervalsDays) {
      const targetDate = new Date(now.getTime() + (intervalDays * 24 * 60 * 60 * 1000));
      const { data: bookings, error } = await supabase
        .from('trip_bookings')
        .select(`
          *,
          trips!inner(title, destination, dates),
          customer_profiles!inner(full_name, user_id)
        `)
        .eq('payment_status', 'pending')
        .gte('payment_deadline', now.toISOString())
        .lte('payment_deadline', targetDate.toISOString())
        .or(`last_reminder_sent.is.null,last_reminder_sent.lt.${new Date(now.getTime() - reminderFrequencyMs).toISOString()}`);

      if (!error && bookings) {
        upcomingDeadlines = upcomingDeadlines.concat(bookings);
      }
    }

    // Remove duplicates
    upcomingDeadlines = upcomingDeadlines.filter((booking, index, self) => 
      index === self.findIndex(b => b.id === booking.id)
    );

    console.log(`Found ${upcomingDeadlines.length} bookings with upcoming payment deadlines`);

    // Send reminder emails
    for (const booking of upcomingDeadlines || []) {
      const daysUntilDeadline = Math.ceil(
        (new Date(booking.payment_deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Get user email from auth
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
        booking.customer_profiles.user_id
      );

      if (userError || !userData.user?.email) {
        console.error('Error getting user email:', userError);
        continue;
      }

      const userEmail = userData.user.email;

      try {
        await resend.emails.send({
          from: "One More Mile <onboarding@resend.dev>",
          to: [userEmail],
          subject: `Payment Reminder: ${daysUntilDeadline} days left for ${booking.trips.destination}`,
          html: `
            <h1>Payment Reminder</h1>
            <p>Dear ${booking.customer_profiles.full_name},</p>
            
            <p>This is a reminder that your payment for the following trip is due in <strong>${daysUntilDeadline} days</strong>:</p>
            
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>${booking.trips.title}</h3>
              <p><strong>Destination:</strong> ${booking.trips.destination}</p>
              <p><strong>Dates:</strong> ${booking.trips.dates}</p>
              <p><strong>Payment Due:</strong> ${new Date(booking.payment_deadline).toLocaleDateString()}</p>
              <p><strong>Amount:</strong> $${booking.total_amount}</p>
            </div>
            
            <p><strong>Important:</strong> If payment is not received by the deadline, your reservation will be automatically cancelled.</p>
            
            <p>To complete your payment, please log in to your dashboard and click "Pay Now" for this booking.</p>
            
            <p>Best regards,<br>
            The One More Mile Team</p>
            
            <hr>
            <p style="color: #666; font-size: 12px;">
              If you have any questions, contact us at adventures@onemoremile.com
            </p>
          `,
        });

        // Update reminder tracking
        await supabase
          .from('trip_bookings')
          .update({
            last_reminder_sent: now.toISOString(),
            reminder_count: (booking.reminder_count || 0) + 1
          })
          .eq('id', booking.id);

        console.log(`Reminder sent to ${userEmail} for booking ${booking.id}`);
      } catch (emailError) {
        console.error(`Failed to send reminder to ${userEmail}:`, emailError);
      }
    }

    // Cancel overdue bookings (considering grace period)
    const cancellationCutoff = new Date(now.getTime() - gracePeriodMs);
    const { data: overdueBookings, error: overdueError } = await supabase
      .from('trip_bookings')
      .select(`
        *,
        trips!inner(title, destination),
        customer_profiles!inner(full_name, user_id)
      `)
      .eq('payment_status', 'pending')
      .lt('payment_deadline', cancellationCutoff.toISOString());

    if (overdueError) {
      console.error('Error fetching overdue bookings:', overdueError);
      throw overdueError;
    }

    console.log(`Found ${overdueBookings?.length || 0} overdue bookings to cancel`);

    // Cancel overdue bookings and send cancellation emails
    for (const booking of overdueBookings || []) {
      // Get user email from auth
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
        booking.customer_profiles.user_id
      );

      if (userError || !userData.user?.email) {
        console.error('Error getting user email:', userError);
        continue;
      }

      const userEmail = userData.user.email;

      try {
        // Cancel the booking
        await supabase
          .from('trip_bookings')
          .update({
            booking_status: 'cancelled',
            notes: 'Automatically cancelled due to missed payment deadline'
          })
          .eq('id', booking.id);

        // Send cancellation email
        await resend.emails.send({
          from: "One More Mile <onboarding@resend.dev>",
          to: [userEmail],
          subject: `Booking Cancelled: ${booking.trips.destination}`,
          html: `
            <h1>Booking Cancelled</h1>
            <p>Dear ${booking.customer_profiles.full_name},</p>
            
            <p>We regret to inform you that your reservation has been cancelled due to non-payment by the deadline:</p>
            
            <div style="background: #fff2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <h3>${booking.trips.title}</h3>
              <p><strong>Destination:</strong> ${booking.trips.destination}</p>
              <p><strong>Payment was due:</strong> ${new Date(booking.payment_deadline).toLocaleDateString()}</p>
              <p><strong>Booking Status:</strong> Cancelled</p>
            </div>
            
            <p>If you believe this cancellation was made in error, please contact us immediately at adventures@onemoremile.com</p>
            
            <p>We hope to serve you in the future.</p>
            
            <p>Best regards,<br>
            The One More Mile Team</p>
          `,
        });

        console.log(`Booking ${booking.id} cancelled and notification sent to ${userEmail}`);
      } catch (error) {
        console.error(`Failed to cancel booking ${booking.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        remindersSent: upcomingDeadlines?.length || 0,
        bookingsCancelled: overdueBookings?.length || 0,
        message: "Payment reminders processed successfully"
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in payment-reminders function:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process payment reminders",
        details: error.message
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        },
      }
    );
  }
};

serve(handler);