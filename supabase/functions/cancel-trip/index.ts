import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CancelTripRequest {
  tripId: string;
  cancellationReason: string;
  refundOffered?: boolean;
  alternativeTrips?: string[];
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Cancel trip function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { tripId, cancellationReason, refundOffered = true, alternativeTrips = [] }: CancelTripRequest = await req.json();
    console.log("Processing trip cancellation for trip:", tripId);

    // Get trip details
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (tripError || !trip) {
      console.error("Trip not found:", tripError);
      throw new Error("Trip not found");
    }

    // Get all paid participants for this trip
    const { data: bookings, error: bookingsError } = await supabase
      .from('trip_bookings')
      .select(`
        *,
        customer_profiles:user_id (
          full_name,
          phone
        )
      `)
      .eq('trip_id', tripId)
      .eq('payment_status', 'paid');

    if (bookingsError) {
      console.error("Error fetching bookings:", bookingsError);
      throw bookingsError;
    }

    // Update trip status to cancelled
    const { error: updateError } = await supabase
      .from('trips')
      .update({
        is_active: false,
        trip_status: 'cancelled',
        cancellation_reason: cancellationReason,
        cancelled_at: new Date().toISOString()
      })
      .eq('id', tripId);

    if (updateError) {
      console.error("Error updating trip status:", updateError);
      throw updateError;
    }

    // Update all bookings to cancelled
    if (bookings && bookings.length > 0) {
      const { error: bookingUpdateError } = await supabase
        .from('trip_bookings')
        .update({
          booking_status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('trip_id', tripId)
        .eq('payment_status', 'paid');

      if (bookingUpdateError) {
        console.error("Error updating booking statuses:", bookingUpdateError);
      }

      // Get participant emails and send notifications
      const participantEmails: string[] = [];
      
      for (const booking of bookings) {
        try {
          const { data: userData, error: userError } = await supabase.auth.admin.getUserById(booking.user_id);
          
          if (userError || !userData.user?.email) {
            console.error(`Error getting user email for booking ${booking.id}:`, userError);
            continue;
          }

          participantEmails.push(userData.user.email);

          // Send individual notification email
          await notifyParticipantCancellation(
            userData.user.email,
            booking.customer_profiles?.full_name || 'Valued Customer',
            trip,
            cancellationReason,
            refundOffered,
            alternativeTrips,
            booking.total_amount
          );

        } catch (error) {
          console.error(`Error processing participant ${booking.user_id}:`, error);
        }
      }

      console.log(`Sent cancellation notifications to ${participantEmails.length} participants`);
    }

    // Notify admin about the cancellation completion
    await notifyAdminCancellationComplete(trip, bookings?.length || 0, cancellationReason);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Trip cancelled successfully. ${bookings?.length || 0} participants notified.`,
        participantsNotified: bookings?.length || 0
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in cancel-trip function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

async function notifyParticipantCancellation(
  email: string,
  customerName: string,
  trip: any,
  cancellationReason: string,
  refundOffered: boolean,
  alternativeTrips: string[],
  paidAmount: number
) {
  const alternativesSection = alternativeTrips.length > 0 ? `
    <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #065f46; margin-top: 0;">🌟 Alternative Trip Recommendations</h3>
      <p>We'd love to help you find another amazing adventure:</p>
      <ul style="color: #374151;">
        ${alternativeTrips.map(alt => `<li>${alt}</li>`).join('')}
      </ul>
      <p>Please contact us to discuss these alternatives or browse our full selection of trips.</p>
    </div>
  ` : '';

  const refundSection = refundOffered ? `
    <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #1e40af; margin-top: 0;">💰 Refund Information</h3>
      <p><strong>Full refund of $${paidAmount?.toLocaleString() || 'your payment'} will be processed within 5-7 business days.</strong></p>
      <p>You will receive a separate email confirmation once the refund has been initiated.</p>
    </div>
  ` : `
    <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #92400e; margin-top: 0;">💰 Payment Information</h3>
      <p>Our customer service team will contact you within 24 hours regarding your payment of $${paidAmount?.toLocaleString() || 'your payment'}.</p>
    </div>
  `;

  const emailResponse = await resend.emails.send({
    from: "One More Mile <onboarding@resend.dev>",
    to: [email],
    subject: `Important: Your trip "${trip.title}" has been cancelled`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #dc2626;">We're sorry - Your trip has been cancelled</h1>
        
        <p>Dear ${customerName},</p>
        
        <p>We regret to inform you that your upcoming trip has been cancelled due to unforeseen circumstances.</p>
        
        <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
          <h2 style="color: #991b1b; margin-top: 0;">Trip Details:</h2>
          <ul style="color: #374151;">
            <li><strong>Trip:</strong> ${trip.title}</li>
            <li><strong>Destination:</strong> ${trip.destination}</li>
            <li><strong>Scheduled Dates:</strong> ${trip.dates}</li>
            <li><strong>Booking ID:</strong> ${trip.id}</li>
          </ul>
          
          <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #fca5a5;">
            <p><strong>Reason for cancellation:</strong></p>
            <p style="font-style: italic;">${cancellationReason}</p>
          </div>
        </div>
        
        ${refundSection}
        
        ${alternativesSection}
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1f2937; margin-top: 0;">What happens next?</h3>
          <ol style="color: #374151;">
            <li><strong>Immediate:</strong> Your booking is officially cancelled</li>
            ${refundOffered ? '<li><strong>Within 5-7 days:</strong> Full refund processed to your original payment method</li>' : '<li><strong>Within 24 hours:</strong> Our team will contact you about your payment</li>'}
            <li><strong>Optional:</strong> Contact us to discuss alternative trips or future bookings</li>
          </ol>
        </div>
        
        <p style="margin-top: 30px;">We sincerely apologize for any inconvenience this may cause. We understand how disappointing this must be, especially when you were looking forward to this adventure.</p>
        
        <p><strong>Need assistance?</strong> Our customer service team is ready to help:</p>
        <ul>
          <li>📧 Email: kenny_hermans93@hotmail.com</li>
          <li>📞 Phone: [Contact number]</li>
          <li>🌐 Website: <a href="${Deno.env.get("SUPABASE_URL")?.replace(/supabase\.co.*/, "lovable.app")}">One More Mile</a></li>
        </ul>
        
        <p style="margin-top: 30px;">Thank you for choosing One More Mile. We hope to welcome you on a future adventure.</p>
        
        <p>With sincere apologies,<br>The One More Mile Team</p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="color: #6b7280; font-size: 12px;">
          This is an automated message regarding your trip cancellation. Please do not reply directly to this email. 
          For assistance, please contact our customer service team using the information provided above.
        </p>
      </div>
    `,
  });

  console.log(`Cancellation notification sent to ${email}:`, emailResponse);
}

async function notifyAdminCancellationComplete(trip: any, participantCount: number, cancellationReason: string) {
  const emailResponse = await resend.emails.send({
    from: "One More Mile <onboarding@resend.dev>",
    to: ["kenny_hermans93@hotmail.com"],
    subject: `✅ Trip cancellation completed: "${trip.title}"`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #059669;">✅ Trip Cancellation Completed</h1>
        
        <p>The trip cancellation has been successfully processed.</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="color: #1f2937; margin-top: 0;">Cancellation Summary:</h2>
          <ul>
            <li><strong>Trip:</strong> ${trip.title}</li>
            <li><strong>Destination:</strong> ${trip.destination}</li>
            <li><strong>Scheduled Dates:</strong> ${trip.dates}</li>
            <li><strong>Participants Notified:</strong> ${participantCount}</li>
            <li><strong>Cancellation Reason:</strong> ${cancellationReason}</li>
            <li><strong>Cancelled At:</strong> ${new Date().toLocaleString()}</li>
          </ul>
        </div>
        
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Follow-up actions needed:</strong></p>
          <ul>
            <li>Monitor refund processing</li>
            <li>Follow up with participants who may have questions</li>
            <li>Update any marketing materials featuring this trip</li>
            <li>Review and address the root cause of cancellation</li>
          </ul>
        </div>
        
        <p>All participants have been notified via email with full details about the cancellation and refund process.</p>
      </div>
    `,
  });

  console.log("Admin cancellation completion notification sent:", emailResponse);
}

serve(handler);