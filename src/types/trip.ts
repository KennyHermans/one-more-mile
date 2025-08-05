import { Database } from '@/integrations/supabase/types';

// Base Trip type from database
export type DbTrip = Database['public']['Tables']['trips']['Row'];
export type DbTripInsert = Database['public']['Tables']['trips']['Insert'];
export type DbTripUpdate = Database['public']['Tables']['trips']['Update'];

// Program day structure for trip itineraries
export interface ProgramDay {
  day: number;
  title: string;
  description: string;
  activities: string[];
  location?: string;
  coordinates?: { lat: number; lng: number };
}

// Complete Trip interface aligned with database schema
export interface Trip {
  id: string;
  title: string;
  description: string;
  destination: string;
  dates: string;
  start_date: string | null;
  end_date: string | null;
  duration_days: number;
  price: string;
  group_size: string;
  max_participants: number;
  current_participants: number | null;
  theme: string;
  difficulty_level: string;
  sensei_id: string | null;
  sensei_name: string;
  image_url: string;
  trip_status: string;
  is_active: boolean | null;
  rating: number | null;
  included_amenities: string[] | null;
  excluded_items: string[] | null;
  requirements: string[] | null;
  program: ProgramDay[] | null;
  created_by_sensei: boolean;
  created_by_user_id: string | null;
  replacement_needed: boolean | null;
  cancelled_by_sensei: boolean | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

// Minimal Trip interface for lists and cards
export interface TripListItem {
  id: string;
  title: string;
  destination: string;
  dates: string;
  start_date: string | null;
  end_date: string | null;
  price: string;
  theme: string;
  sensei_name: string;
  sensei_id: string | null;
  image_url: string;
  difficulty_level: string;
  current_participants: number | null;
  max_participants: number;
  rating: number | null;
  trip_status: string;
}

// Trip with sensei profile information
export interface TripWithSensei extends Trip {
  sensei_profile?: {
    id: string;
    name: string;
    image_url: string | null;
    location: string;
    rating: number | null;
    specialties: string[];
  };
}

// Trip form data interface for creating/editing
export interface TripFormData {
  title: string;
  description: string;
  destination: string;
  dates: string;
  duration_days: number;
  price: string;
  group_size: string;
  max_participants: number;
  theme: string;
  difficulty_level: string;
  image_url: string;
  included_amenities: string[];
  excluded_items: string[];
  requirements: string[];
  program: ProgramDay[];
}

// Trip booking interface
export interface TripBooking {
  id: string;
  trip_id: string;
  user_id: string;
  booking_status: string;
  payment_status: string;
  total_amount: number | null;
  booking_date: string;
  payment_deadline: string | null;
  booking_type: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  trip?: Trip | TripListItem;
}

// Trip analytics interface
export interface TripAnalytics {
  trip_id: string;
  total_bookings: number;
  confirmed_bookings: number;
  revenue: number;
  completion_rate: number;
  average_rating: number;
  review_count: number;
}

// Trip milestone for timeline visualization
export interface TripMilestone {
  id: string;
  title: string;
  description: string;
  type: 'booking' | 'preparation' | 'travel' | 'completion';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  dueDate?: string;
  completedDate?: string;
}

// Trip comparison data
export interface TripComparisonData extends TripListItem {
  included_items?: string[];
  group_details?: {
    min_age?: number;
    max_age?: number;
    experience_level?: string;
  };
}

// Type guards and utilities
export const isTripActive = (trip: Trip | TripListItem): boolean => {
  return trip.trip_status === 'approved' || trip.trip_status === 'active';
};

export const isTripBookable = (trip: Trip | TripListItem): boolean => {
  return isTripActive(trip) && 
         (trip.current_participants || 0) < trip.max_participants;
};

export const getTripAvailability = (trip: Trip | TripListItem) => {
  const current = trip.current_participants || 0;
  const max = trip.max_participants;
  const available = max - current;
  
  return {
    current,
    max,
    available,
    isFullyBooked: available <= 0,
    isAlmostFull: available <= 2 && available > 0
  };
};

// Transform database trip to Trip interface
export const transformDbTrip = (dbTrip: DbTrip): Trip => {
  try {
    // Handle program field parsing with validation
    let programData: ProgramDay[] | null = null;
    if (dbTrip.program) {
      if (Array.isArray(dbTrip.program)) {
        programData = dbTrip.program as unknown as ProgramDay[];
      } else if (typeof dbTrip.program === 'string') {
        try {
          const parsed = JSON.parse(dbTrip.program);
          programData = Array.isArray(parsed) ? parsed : null;
        } catch (parseError) {
          console.warn('Failed to parse trip program JSON:', parseError);
          programData = null;
        }
      }
    }

    // Handle date field conversions
    const startDate = dbTrip.start_date ? new Date(dbTrip.start_date).toISOString().split('T')[0] : null;
    const endDate = dbTrip.end_date ? new Date(dbTrip.end_date).toISOString().split('T')[0] : null;

    return {
      ...dbTrip,
      is_active: dbTrip.is_active ?? true,
      current_participants: dbTrip.current_participants ?? 0,
      start_date: startDate,
      end_date: endDate,
      program: programData,
      included_amenities: Array.isArray(dbTrip.included_amenities) ? dbTrip.included_amenities : [],
      excluded_items: Array.isArray(dbTrip.excluded_items) ? dbTrip.excluded_items : [],
      requirements: Array.isArray(dbTrip.requirements) ? dbTrip.requirements : [],
    };
  } catch (error) {
    console.error('Error transforming database trip:', error);
    // Return basic trip data if transformation fails
    return {
      ...dbTrip,
      is_active: dbTrip.is_active ?? true,
      current_participants: dbTrip.current_participants ?? 0,
      program: null,
      included_amenities: [],
      excluded_items: [],
      requirements: [],
    };
  }
};

// Transform Trip to TripListItem
export const toTripListItem = (trip: Trip): TripListItem => ({
  id: trip.id,
  title: trip.title,
  destination: trip.destination,
  dates: trip.dates,
  start_date: trip.start_date,
  end_date: trip.end_date,
  price: trip.price,
  theme: trip.theme,
  sensei_name: trip.sensei_name,
  sensei_id: trip.sensei_id,
  image_url: trip.image_url,
  difficulty_level: trip.difficulty_level,
  current_participants: trip.current_participants,
  max_participants: trip.max_participants,
  rating: trip.rating,
  trip_status: trip.trip_status,
});