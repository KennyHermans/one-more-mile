import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AssignBackupRequest {
  tripId: string;
  cancellationReason: string;
  originalSenseiName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Assign backup sensei function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { tripId, cancellationReason, originalSenseiName }: AssignBackupRequest = await req.json();
    console.log("Processing backup assignment for trip:", tripId);

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

    // Find approved backup sensei applications for this trip
    const { data: backupApplications, error: backupError } = await supabase
      .from('backup_sensei_applications')
      .select(`
        *,
        sensei_profiles:sensei_id (
          id,
          name,
          user_id,
          specialties,
          rating,
          is_active,
          is_offline
        )
      `)
      .eq('trip_id', tripId)
      .eq('status', 'approved')
      .order('applied_at', { ascending: true });

    if (backupError) {
      console.error("Error fetching backup applications:", backupError);
      throw backupError;
    }

    if (!backupApplications || backupApplications.length === 0) {
      console.log("No approved backup senseis found for trip:", tripId);
      
      // Notify admin that no backup is available
      await notifyAdminNoBackup(trip, cancellationReason, originalSenseiName);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "No approved backup senseis available. Admin has been notified." 
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Find the first available backup sensei (active and not offline)
    let selectedBackup = null;
    for (const application of backupApplications) {
      const sensei = application.sensei_profiles;
      if (sensei && sensei.is_active && !sensei.is_offline) {
        selectedBackup = application;
        break;
      }
    }

    if (!selectedBackup) {
      console.log("No available backup senseis found for trip:", tripId);
      
      // Notify admin that backup senseis are not available
      await notifyAdminNoAvailableBackup(trip, backupApplications, cancellationReason, originalSenseiName);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "No available backup senseis. Admin has been notified." 
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Assign the backup sensei to the trip
    const { error: updateError } = await supabase
      .from('trips')
      .update({
        sensei_id: selectedBackup.sensei_id,
        sensei_name: selectedBackup.sensei_profiles.name,
        backup_sensei_id: selectedBackup.sensei_id,
        replacement_needed: false,
        cancelled_by_sensei: false,
        cancellation_reason: null,
        cancelled_at: null
      })
      .eq('id', tripId);

    if (updateError) {
      console.error("Error updating trip with backup sensei:", updateError);
      throw updateError;
    }

    // Update the backup application status
    const { error: statusError } = await supabase
      .from('backup_sensei_applications')
      .update({ status: 'assigned' })
      .eq('id', selectedBackup.id);

    if (statusError) {
      console.error("Error updating backup application status:", statusError);
    }

    // Get backup sensei's user email
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
      selectedBackup.sensei_profiles.user_id
    );

    if (userError || !userData.user?.email) {
      console.error("Error getting backup sensei email:", userError);
      throw new Error("Could not get backup sensei email");
    }

    // Send notification email to backup sensei
    await notifyBackupSensei(
      userData.user.email,
      selectedBackup.sensei_profiles.name,
      trip,
      cancellationReason,
      originalSenseiName
    );

    // Notify admin about successful assignment
    await notifyAdminSuccess(trip, selectedBackup.sensei_profiles.name, originalSenseiName);

    console.log("Successfully assigned backup sensei:", selectedBackup.sensei_profiles.name);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Backup sensei ${selectedBackup.sensei_profiles.name} has been assigned and notified.`,
        backupSenseiName: selectedBackup.sensei_profiles.name
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in assign-backup-sensei function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

async function notifyBackupSensei(
  email: string,
  senseiName: string,
  trip: any,
  cancellationReason: string,
  originalSenseiName?: string
) {
  const emailResponse = await resend.emails.send({
    from: "One More Mile <onboarding@resend.dev>",
    to: [email],
    subject: `🚨 Urgent: You've been assigned to lead "${trip.title}"`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">🚨 Urgent Trip Assignment</h1>
        
        <p>Dear ${senseiName},</p>
        
        <p><strong>You have been immediately assigned to lead a trip as a backup sensei!</strong></p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="color: #1f2937; margin-top: 0;">Trip Details:</h2>
          <ul style="color: #374151;">
            <li><strong>Trip:</strong> ${trip.title}</li>
            <li><strong>Destination:</strong> ${trip.destination}</li>
            <li><strong>Dates:</strong> ${trip.dates}</li>
            <li><strong>Group Size:</strong> ${trip.group_size}</li>
            <li><strong>Price:</strong> ${trip.price}</li>
          </ul>
        </div>
        
        ${originalSenseiName ? `
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Reason for backup assignment:</strong></p>
          <p>The original sensei (${originalSenseiName}) had to cancel due to: ${cancellationReason}</p>
        </div>
        ` : ''}
        
        <p><strong>What you need to do:</strong></p>
        <ol>
          <li>Log into your Sensei Dashboard immediately</li>
          <li>Review all trip details and participant information</li>
          <li>Contact participants to introduce yourself and reassure them</li>
          <li>Prepare for the trip according to the existing itinerary</li>
        </ol>
        
        <p style="margin-top: 30px;">
          <a href="${Deno.env.get("SUPABASE_URL")?.replace(/supabase\.co.*/, "lovable.app")}/sensei/dashboard" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            🎯 Go to Dashboard
          </a>
        </p>
        
        <p style="color: #6b7280; margin-top: 30px;">
          Time is of the essence! Please respond immediately and begin preparations.
        </p>
        
        <p>Thank you for your flexibility and professionalism.</p>
        
        <p>Best regards,<br>The One More Mile Team</p>
      </div>
    `,
  });

  console.log("Backup sensei notification sent:", emailResponse);
}

async function notifyAdminNoBackup(trip: any, cancellationReason: string, originalSenseiName?: string) {
  const emailResponse = await resend.emails.send({
    from: "One More Mile <onboarding@resend.dev>",
    to: ["kenny_hermans93@hotmail.com"],
    subject: `🚨 URGENT: No backup sensei available for "${trip.title}"`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #dc2626;">🚨 URGENT: No Backup Sensei Available</h1>
        
        <p>A trip has been cancelled but NO approved backup senseis are available!</p>
        
        <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="color: #991b1b; margin-top: 0;">Trip Details:</h2>
          <ul>
            <li><strong>Trip:</strong> ${trip.title}</li>
            <li><strong>Destination:</strong> ${trip.destination}</li>
            <li><strong>Dates:</strong> ${trip.dates}</li>
            <li><strong>Original Sensei:</strong> ${originalSenseiName || 'Unknown'}</li>
            <li><strong>Cancellation Reason:</strong> ${cancellationReason}</li>
          </ul>
        </div>
        
        <p><strong>IMMEDIATE ACTION REQUIRED:</strong></p>
        <ol>
          <li>Find a replacement sensei manually</li>
          <li>Contact participants about the situation</li>
          <li>Consider trip postponement if no replacement found</li>
        </ol>
        
        <p style="color: #dc2626; font-weight: bold;">This requires immediate attention!</p>
      </div>
    `,
  });

  console.log("Admin no-backup notification sent:", emailResponse);
}

async function notifyAdminNoAvailableBackup(
  trip: any, 
  backupApplications: any[], 
  cancellationReason: string, 
  originalSenseiName?: string
) {
  const unavailableBackups = backupApplications.map(app => 
    `${app.sensei_profiles?.name} (${app.sensei_profiles?.is_active ? 'inactive' : 'offline'})`
  ).join(', ');

  const emailResponse = await resend.emails.send({
    from: "One More Mile <onboarding@resend.dev>",
    to: ["kenny_hermans93@hotmail.com"],
    subject: `🚨 URGENT: Backup senseis unavailable for "${trip.title}"`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #dc2626;">🚨 URGENT: Backup Senseis Unavailable</h1>
        
        <p>A trip has been cancelled and approved backup senseis are currently unavailable!</p>
        
        <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="color: #991b1b; margin-top: 0;">Trip Details:</h2>
          <ul>
            <li><strong>Trip:</strong> ${trip.title}</li>
            <li><strong>Destination:</strong> ${trip.destination}</li>
            <li><strong>Dates:</strong> ${trip.dates}</li>
            <li><strong>Original Sensei:</strong> ${originalSenseiName || 'Unknown'}</li>
            <li><strong>Cancellation Reason:</strong> ${cancellationReason}</li>
          </ul>
        </div>
        
        <div style="background-color: #fbbf24; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Unavailable backup senseis:</strong> ${unavailableBackups}</p>
        </div>
        
        <p><strong>IMMEDIATE ACTION REQUIRED:</strong></p>
        <ol>
          <li>Contact unavailable backup senseis to check availability</li>
          <li>Find alternative replacement sensei</li>
          <li>Contact participants about the situation</li>
        </ol>
      </div>
    `,
  });

  console.log("Admin unavailable-backup notification sent:", emailResponse);
}

async function notifyAdminSuccess(trip: any, backupSenseiName: string, originalSenseiName?: string) {
  const emailResponse = await resend.emails.send({
    from: "One More Mile <onboarding@resend.dev>",
    to: ["kenny_hermans93@hotmail.com"],
    subject: `✅ Backup sensei assigned to "${trip.title}"`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #059669;">✅ Backup Sensei Successfully Assigned</h1>
        
        <p>A backup sensei has been automatically assigned to a cancelled trip.</p>
        
        <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="color: #065f46; margin-top: 0;">Assignment Details:</h2>
          <ul>
            <li><strong>Trip:</strong> ${trip.title}</li>
            <li><strong>Destination:</strong> ${trip.destination}</li>
            <li><strong>Dates:</strong> ${trip.dates}</li>
            <li><strong>Original Sensei:</strong> ${originalSenseiName || 'Unknown'}</li>
            <li><strong>New Sensei:</strong> ${backupSenseiName}</li>
          </ul>
        </div>
        
        <p>The backup sensei has been notified and should begin preparations immediately.</p>
        
        <p><strong>You may want to:</strong></p>
        <ul>
          <li>Follow up with the new sensei to ensure smooth transition</li>
          <li>Monitor participant communications</li>
          <li>Check if any trip details need updating</li>
        </ul>
      </div>
    `,
  });

  console.log("Admin success notification sent:", emailResponse);
}

serve(handler);