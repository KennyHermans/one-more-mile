import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BackupRequestNotification {
  requestId: string;
  senseiId: string;
  tripId: string;
  tripTitle: string;
  matchScore: number;
  isFollowUp?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { requestId, senseiId, tripId, tripTitle, matchScore, isFollowUp }: BackupRequestNotification = await req.json();

    console.log(`Sending backup request notification to sensei ${senseiId} for trip ${tripId}`);

    // Get sensei details
    const { data: sensei, error: senseiError } = await supabase
      .from('sensei_profiles')
      .select('name, user_id')
      .eq('id', senseiId)
      .single();

    if (senseiError || !sensei) {
      console.error('Error fetching sensei:', senseiError);
      return new Response(JSON.stringify({ error: 'Sensei not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get sensei email from auth
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(sensei.user_id);
    
    if (userError || !user?.email) {
      console.error('Error fetching user email:', userError);
      return new Response(JSON.stringify({ error: 'User email not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get trip details
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('title, theme, dates, destination, description')
      .eq('id', tripId)
      .single();

    if (tripError || !trip) {
      console.error('Error fetching trip:', tripError);
      return new Response(JSON.stringify({ error: 'Trip not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const subject = isFollowUp 
      ? `Urgent: Backup Sensei Opportunity - ${tripTitle}`
      : `Backup Sensei Opportunity - ${tripTitle}`;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Backup Sensei Request</h1>
        
        ${isFollowUp ? '<p style="color: #dc2626; font-weight: bold;">⚠️ URGENT: Additional backup sensei needed</p>' : ''}
        
        <p>Hello ${sensei.name},</p>
        
        <p>We have identified you as an excellent match for a backup sensei position on the following trip:</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="margin-top: 0; color: #1f2937;">${trip.title}</h2>
          <p><strong>Theme:</strong> ${trip.theme}</p>
          <p><strong>Dates:</strong> ${trip.dates}</p>
          <p><strong>Destination:</strong> ${trip.destination}</p>
          <p><strong>Match Score:</strong> ${matchScore}/100</p>
        </div>
        
        <p><strong>About this opportunity:</strong></p>
        <p>${trip.description}</p>
        
        <p>As a backup sensei, you would:</p>
        <ul>
          <li>Be on standby to lead this trip if the primary sensei becomes unavailable</li>
          <li>Receive compensation for your commitment</li>
          <li>Gain priority consideration for future trips</li>
          <li>Join our community of trusted backup senseis</li>
        </ul>
        
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>⏰ Please respond within 3 days</strong></p>
          <p style="margin: 5px 0 0 0;">This request will expire if we don't hear from you by the deadline.</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://qvirgcrbnwcyhbqdazjy.supabase.co/dashboard/trips/${tripId}" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Trip Details & Respond
          </a>
        </div>
        
        <p>If you have any questions, please don't hesitate to contact us.</p>
        
        <p>Best regards,<br>The One More Mile Team</p>
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: "One More Mile <noreply@onemoremill.com>",
      to: [user.email],
      subject: subject,
      html: emailHtml,
    });

    console.log('Backup request notification sent successfully:', emailResponse);

    // Log the notification in the database
    await supabase
      .from('customer_notifications')
      .insert({
        user_id: sensei.user_id,
        title: subject,
        message: `Backup sensei opportunity for ${tripTitle} - Match Score: ${matchScore}%`,
        type: 'backup_request',
        related_trip_id: tripId
      });

    return new Response(JSON.stringify({
      success: true,
      message: 'Backup request notification sent successfully',
      emailId: emailResponse.data?.id
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error in send-backup-request-notification function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

serve(handler);