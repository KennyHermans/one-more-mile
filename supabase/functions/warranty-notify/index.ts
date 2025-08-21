import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { sensei_id, type, title, message, metadata } = await req.json();

    // Create notification record
    const { data: notification, error: notificationError } = await supabaseClient
      .from("sensei_warranty_notifications")
      .insert({
        sensei_id,
        type,
        title,
        message,
        metadata: metadata || {},
        is_read: false
      })
      .select()
      .single();

    if (notificationError) throw notificationError;

    // Get sensei profile for additional notification methods
    const { data: senseiProfile, error: profileError } = await supabaseClient
      .from("sensei_profiles")
      .select("name, user_id")
      .eq("id", sensei_id)
      .single();

    if (profileError) throw profileError;

    // Create in-app notification
    const { error: inAppError } = await supabaseClient
      .from("customer_notifications")
      .insert({
        user_id: senseiProfile.user_id,
        type: 'warranty',
        title,
        message,
        is_read: false
      });

    if (inAppError) {
      console.error("Failed to create in-app notification:", inAppError);
    }

    // Log notification for admin tracking
    console.log(`Warranty notification sent to ${senseiProfile.name} (${sensei_id}): ${type} - ${title}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notification_id: notification.id,
        sensei_name: senseiProfile.name 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error sending warranty notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});