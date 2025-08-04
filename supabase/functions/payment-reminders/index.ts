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

// Helper function to get user by ID with retry
async function getUserByIdWithRetry(supabase: any, userId: string, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
      if (userError) throw userError;
      return userData.user;
    } catch (error) {
      console.log(`Attempt ${attempt} failed for user ${userId}:`, error);
      if (attempt === maxRetries) return null;
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
    }
  }
  return null;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Payment reminders function triggered");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching payment settings...');
    
    // Get payment settings including reservation deadline
    const { data: paymentSettings } = await supabase
      .from('payment_settings')
      .select('setting_name, setting_value')
      .in('setting_name', ['reminder_days_before', 'reminder_frequency_days', 'grace_period_days', 'reservation_deadline_days']);
    
    const settings = paymentSettings?.reduce((acc: Record<string, number>, setting: any) => {
      acc[setting.setting_name] = parseInt(setting.setting_value);
      return acc;
    }, {} as Record<string, number>) || {};
    
    const reminderDaysBefore = settings.reminder_days_before || 7;
    const reminderFrequencyDays = settings.reminder_frequency_days || 3;
    const gracePeriodDays = settings.grace_period_days || 2;
    const reservationDeadlineDays = settings.reservation_deadline_days || 7;

    console.log('Querying pending bookings and reservations...');
    
    // Query pending bookings with upcoming deadlines
    const reminderThreshold = new Date();
    reminderThreshold.setDate(reminderThreshold.getDate() + reminderDaysBefore);
    
    const { data: pendingBookings, error: bookingsError } = await supabase
      .from('trip_bookings')
      .select(`
        id,
        user_id,
        trip_id,
        payment_deadline,
        reservation_deadline,
        booking_type,
        last_reminder_sent,
        reminder_count,
        trips!inner(title, dates, price)
      `)
      .eq('payment_status', 'pending')
      .or(`payment_deadline.lte.${reminderThreshold.toISOString()},reservation_deadline.lte.${reminderThreshold.toISOString()}`)
      .or(`last_reminder_sent.is.null,last_reminder_sent.lt.${new Date(Date.now() - reminderFrequencyDays * 24 * 60 * 60 * 1000).toISOString()}`);
    
    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      throw bookingsError;
    }

    console.log(`Found ${pendingBookings?.length || 0} bookings requiring reminders`);

    // Send reminders
    for (const booking of pendingBookings || []) {
      try {
        console.log(`Processing booking ${booking.id}...`);
        
        const user = await getUserByIdWithRetry(supabase, booking.user_id);
        if (!user) {
          console.log(`User not found for booking ${booking.id}, skipping...`);
          continue;
        }

        const trip = booking.trips;
        const isReservation = booking.booking_type === 'reservation';
        const deadline = isReservation ? booking.reservation_deadline : booking.payment_deadline;
        const daysUntilDeadline = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        
        console.log(`Sending ${isReservation ? 'reservation' : 'payment'} reminder for booking ${booking.id} to ${user.email}`);
        
        // Different email content for reservations vs regular bookings
        const emailSubject = isReservation 
          ? `Reservation Expiring Soon: ${trip.title}`
          : `Payment Reminder: ${trip.title}`;
          
        const emailContent = isReservation
          ? `
            <h2>Reservation Expiring Soon</h2>
            <p>Dear ${user.email.split('@')[0]},</p>
            <p>Your reservation for <strong>${trip.title}</strong> expires in ${daysUntilDeadline} days.</p>
            <p>To secure your spot, please complete your payment or make the required deposit of €1,000.</p>
            <p><strong>Trip Details:</strong></p>
            <ul>
              <li>Trip: ${trip.title}</li>
              <li>Dates: ${trip.dates}</li>
              <li>Price: €${trip.price}</li>
              <li>Reservation Expires: ${new Date(deadline).toLocaleDateString()}</li>
            </ul>
            <p>Don't lose your spot - complete your payment today!</p>
            <p>Thank you!</p>
          `
          : `
            <h2>Payment Reminder</h2>
            <p>Dear ${user.email.split('@')[0]},</p>
            <p>This is a friendly reminder that your payment for <strong>${trip.title}</strong> is due in ${daysUntilDeadline} days.</p>
            <p><strong>Trip Details:</strong></p>
            <ul>
              <li>Trip: ${trip.title}</li>
              <li>Dates: ${trip.dates}</li>
              <li>Price: €${trip.price}</li>
              <li>Payment Deadline: ${new Date(deadline).toLocaleDateString()}</li>
            </ul>
            <p>Please complete your payment to secure your booking.</p>
            <p>Thank you!</p>
          `;
        
        // Send email reminder
        const emailData = await resend.emails.send({
          from: 'One More Mile <noreply@resend.dev>',
          to: [user.email],
          subject: emailSubject,
          html: emailContent,
        });

        console.log(`Email sent successfully:`, emailData);

        // Create in-app notification
        await supabase
          .from('customer_notifications')
          .insert({
            user_id: booking.user_id,
            type: isReservation ? 'reservation_reminder' : 'payment_reminder',
            title: isReservation ? 'Reservation Expiring Soon' : 'Payment Reminder',
            message: isReservation 
              ? `Your reservation for "${trip.title}" expires in ${daysUntilDeadline} days. Complete your payment to secure your spot.`
              : `Your payment for "${trip.title}" is due in ${daysUntilDeadline} days.`,
            related_trip_id: booking.trip_id
          });

        // Update booking with reminder info
        await supabase
          .from('trip_bookings')
          .update({
            last_reminder_sent: new Date().toISOString(),
            reminder_count: (booking.reminder_count || 0) + 1
          })
          .eq('id', booking.id);

      } catch (error) {
        console.error(`Error processing booking ${booking.id}:`, error);
      }
    }

    // Cancel overdue bookings and expired reservations
    console.log('Processing overdue bookings and expired reservations...');
    const currentTime = new Date();
    
    const { data: expiredBookings, error: expiredError } = await supabase
      .from('trip_bookings')
      .select(`
        id,
        user_id,
        trip_id,
        payment_deadline,
        reservation_deadline,
        booking_type,
        trips!inner(title, dates, price)
      `)
      .eq('payment_status', 'pending')
      .or(`payment_deadline.lt.${currentTime.toISOString()},reservation_deadline.lt.${currentTime.toISOString()}`);
    
    if (expiredError) {
      console.error('Error fetching expired bookings:', expiredError);
      throw expiredError;
    }
    
    console.log(`Found ${expiredBookings?.length || 0} expired bookings/reservations to cancel`);
    
    // Cancel expired bookings and reservations
    for (const booking of expiredBookings || []) {
      try {
        const isReservation = booking.booking_type === 'reservation';
        const deadline = isReservation ? booking.reservation_deadline : booking.payment_deadline;
        
        // Skip if not actually expired (edge case)
        if (new Date(deadline) > currentTime) continue;
        
        console.log(`Cancelling expired ${isReservation ? 'reservation' : 'booking'} ${booking.id}...`);
        
        const user = await getUserByIdWithRetry(supabase, booking.user_id);
        if (!user) {
          console.log(`User not found for booking ${booking.id}, skipping...`);
          continue;
        }

        const trip = booking.trips;
        
        // Cancel the booking/reservation
        await supabase
          .from('trip_bookings')
          .update({
            payment_status: 'cancelled',
            notes: isReservation 
              ? 'Automatically cancelled - reservation expired'
              : 'Automatically cancelled due to overdue payment'
          })
          .eq('id', booking.id);

        console.log(`${isReservation ? 'Reservation' : 'Booking'} ${booking.id} cancelled successfully`);

        // Create in-app notification
        await supabase
          .from('customer_notifications')
          .insert({
            user_id: booking.user_id,
            type: isReservation ? 'reservation_expired' : 'booking_cancelled',
            title: isReservation ? 'Reservation Expired' : 'Booking Cancelled',
            message: isReservation 
              ? `Your reservation for "${trip.title}" has expired. You can make a new reservation if spots are still available.`
              : `Your booking for "${trip.title}" has been cancelled due to overdue payment.`,
            related_trip_id: booking.trip_id
          });

        // Send cancellation email
        const emailData = await resend.emails.send({
          from: 'One More Mile <noreply@resend.dev>',
          to: [user.email],
          subject: isReservation ? `Reservation Expired: ${trip.title}` : `Booking Cancelled: ${trip.title}`,
          html: isReservation
            ? `
              <h2>Reservation Expired</h2>
              <p>Dear ${user.email.split('@')[0]},</p>
              <p>Your reservation for <strong>${trip.title}</strong> has expired as the payment was not completed within the required timeframe.</p>
              <p><strong>Expired Reservation Details:</strong></p>
              <ul>
                <li>Trip: ${trip.title}</li>
                <li>Dates: ${trip.dates}</li>
                <li>Price: €${trip.price}</li>
                <li>Reservation Deadline: ${new Date(deadline).toLocaleDateString()}</li>
              </ul>
              <p>You can make a new reservation if spots are still available for this trip.</p>
              <p>Thank you for your interest in One More Mile.</p>
            `
            : `
              <h2>Booking Cancelled</h2>
              <p>Dear ${user.email.split('@')[0]},</p>
              <p>We regret to inform you that your booking for <strong>${trip.title}</strong> has been automatically cancelled due to overdue payment.</p>
              <p><strong>Cancelled Booking Details:</strong></p>
              <ul>
                <li>Trip: ${trip.title}</li>
                <li>Dates: ${trip.dates}</li>
                <li>Price: €${trip.price}</li>
                <li>Payment Deadline: ${new Date(deadline).toLocaleDateString()}</li>
              </ul>
              <p>If you believe this is an error, please contact our support team.</p>
              <p>You can still book this trip again if spots are available.</p>
              <p>Thank you for your understanding.</p>
            `,
        });

        console.log(`Cancellation email sent:`, emailData);

      } catch (error) {
        console.error(`Error cancelling booking ${booking.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        remindersSent: pendingBookings?.length || 0,
        bookingsCancelled: expiredBookings?.length || 0,
        message: "Payment reminders and reservation management processed successfully"
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
        error: "Failed to process payment reminders and reservations",
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