import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tripId, senseiId, changes } = await req.json();

    if (!tripId || !senseiId || !changes) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: tripId, senseiId, changes' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Processing trip update notifications for trip:', tripId);

    // Get trip details
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('title, destination, sensei_name')
      .eq('id', tripId)
      .single();

    if (tripError) {
      throw new Error(`Failed to fetch trip: ${tripError.message}`);
    }

    // Get sensei name
    const { data: sensei, error: senseiError } = await supabase
      .from('sensei_profiles')
      .select('name')
      .eq('id', senseiId)
      .single();

    if (senseiError) {
      throw new Error(`Failed to fetch sensei: ${senseiError.message}`);
    }

    // Get customers who have paid bookings for this trip
    const { data: bookings, error: bookingsError } = await supabase
      .from('trip_bookings')
      .select('user_id')
      .eq('trip_id', tripId)
      .eq('payment_status', 'paid');

    if (bookingsError) {
      throw new Error(`Failed to fetch bookings: ${bookingsError.message}`);
    }

    // Create notification message based on changes
    const changedFields = Object.keys(changes);
    const changeDescription = changedFields.length === 1 
      ? changedFields[0] 
      : `${changedFields.length} fields`;

    const notificationTitle = `Trip Update: ${trip.title}`;
    const notificationMessage = `${sensei.name} has updated the ${changeDescription} for your trip "${trip.title}" to ${trip.destination}. Please review the changes in your dashboard.`;

    // Send notifications to customers
    const customerNotifications = bookings?.map(booking => ({
      user_id: booking.user_id,
      type: 'trip_update',
      title: notificationTitle,
      message: notificationMessage,
      related_trip_id: tripId,
      created_at: new Date().toISOString()
    })) || [];

    if (customerNotifications.length > 0) {
      const { error: customerNotificationError } = await supabase
        .from('customer_notifications')
        .insert(customerNotifications);

      if (customerNotificationError) {
        console.error('Failed to create customer notifications:', customerNotificationError);
      } else {
        console.log(`Created ${customerNotifications.length} customer notifications`);
      }
    }

    // Create admin alert
    const { error: adminAlertError } = await supabase
      .from('admin_alerts')
      .insert({
        alert_type: 'trip_update',
        priority: 'medium',
        title: `Trip Updated: ${trip.title}`,
        message: `${sensei.name} has updated "${trip.title}" (${changeDescription}). Changes may need review.`,
        trip_id: tripId,
        sensei_id: senseiId,
        metadata: {
          changes: changes,
          timestamp: new Date().toISOString(),
          sensei_name: sensei.name
        }
      });

    if (adminAlertError) {
      console.error('Failed to create admin alert:', adminAlertError);
    } else {
      console.log('Created admin alert for trip update');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        notificationsSent: customerNotifications.length,
        adminAlertCreated: !adminAlertError
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in send-trip-update-notifications:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});