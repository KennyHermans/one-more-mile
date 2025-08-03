import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('create-admin-booking function called')
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { user_email, trip_id, notes = 'Admin test booking' } = await req.json()
    console.log('Processing booking for:', { user_email, trip_id, notes })

    if (!user_email || !trip_id) {
      throw new Error('user_email and trip_id are required')
    }

    // Get user by email
    const { data: userData, error: userError } = await supabaseClient.auth.admin.listUsers()
    if (userError) throw userError

    const user = userData.users.find(u => u.email === user_email)
    if (!user) {
      throw new Error(`User with email ${user_email} not found`)
    }

    console.log('Found user:', user.id)

    // Check if customer profile exists
    const { data: customerProfile, error: profileError } = await supabaseClient
      .from('customer_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profileError) throw profileError
    if (!customerProfile) {
      throw new Error(`Customer profile not found for user ${user_email}`)
    }

    console.log('Found customer profile')

    // Get trip details
    const { data: trip, error: tripError } = await supabaseClient
      .from('trips')
      .select('*')
      .eq('id', trip_id)
      .single()

    if (tripError) throw tripError
    if (!trip) {
      throw new Error(`Trip with id ${trip_id} not found`)
    }

    console.log('Found trip:', trip.title)

    // Check if booking already exists
    const { data: existingBooking, error: existingError } = await supabaseClient
      .from('trip_bookings')
      .select('*')
      .eq('user_id', user.id)
      .eq('trip_id', trip_id)
      .maybeSingle()

    if (existingError) throw existingError
    if (existingBooking) {
      throw new Error(`Booking already exists for this user and trip`)
    }

    // Parse trip price (remove $ and commas)
    const priceNumber = parseFloat(trip.price.replace(/[$,]/g, ''))

    // Create the booking
    const { data: booking, error: bookingError } = await supabaseClient
      .from('trip_bookings')
      .insert({
        user_id: user.id,
        trip_id: trip_id,
        payment_status: 'paid',
        booking_status: 'confirmed',
        total_amount: priceNumber,
        booking_date: new Date().toISOString(),
        notes: notes
      })
      .select()
      .single()

    if (bookingError) throw bookingError
    console.log('Created booking:', booking.id)

    // Update trip participant count
    const { error: updateError } = await supabaseClient
      .from('trips')
      .update({ 
        current_participants: (trip.current_participants || 0) + 1 
      })
      .eq('id', trip_id)

    if (updateError) throw updateError
    console.log('Updated trip participant count')

    // Create default customer todos
    const todos = [
      {
        user_id: user.id,
        trip_id: trip_id,
        title: 'Complete Travel Documents',
        description: 'Ensure passport is valid for 6+ months from travel date',
        created_by_admin: true
      },
      {
        user_id: user.id,
        trip_id: trip_id,
        title: 'Pack Swimming Gear',
        description: 'Basic swimming ability required - prepare appropriate swimwear and equipment',
        created_by_admin: true
      },
      {
        user_id: user.id,
        trip_id: trip_id,
        title: 'Review Trip Program',
        description: `Familiarize yourself with the ${trip.duration_days}-day itinerary and activities`,
        created_by_admin: true
      }
    ]

    const { error: todosError } = await supabaseClient
      .from('customer_todos')
      .insert(todos)

    if (todosError) throw todosError
    console.log('Created customer todos')

    // The trigger should automatically send welcome message via handle_new_trip_booking

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test booking created successfully',
        booking: {
          id: booking.id,
          user_email: user_email,
          trip_title: trip.title,
          total_amount: priceNumber,
          status: 'confirmed'
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error creating admin booking:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})