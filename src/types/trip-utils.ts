import { Trip, transformDbTrip } from './trip';

// Type guards for checking if data has the minimum required Trip fields
export const isValidTripData = (data: any): boolean => {
  return data && 
         typeof data.id === 'string' &&
         typeof data.title === 'string' &&
         typeof data.destination === 'string';
};

// Creates a minimal Trip object from partial data
export const createMinimalTrip = (data: any): Trip => {
  return {
    id: data.id || '',
    title: data.title || '',
    description: data.description || '',
    destination: data.destination || '',
    dates: data.dates || '',
    start_date: data.start_date || null,
    end_date: data.end_date || null,
    duration_days: data.duration_days || 1,
    price: data.price || '0',
    group_size: data.group_size || '',
    max_participants: data.max_participants || 1,
    current_participants: data.current_participants || 0,
    theme: data.theme || '',
    difficulty_level: data.difficulty_level || 'Moderate',
    sensei_id: data.sensei_id || null,
    sensei_name: data.sensei_name || '',
    backup_sensei_id: data.backup_sensei_id || null,
    image_url: data.image_url || '/placeholder.svg',
    trip_status: data.trip_status || 'draft',
    is_active: data.is_active ?? true,
    rating: data.rating || null,
    included_amenities: Array.isArray(data.included_amenities) ? data.included_amenities : [],
    excluded_items: Array.isArray(data.excluded_items) ? data.excluded_items : [],
    requirements: Array.isArray(data.requirements) ? data.requirements : [],
    program: null,
    created_by_sensei: data.created_by_sensei || false,
    created_by_user_id: data.created_by_user_id || null,
    requires_backup_sensei: data.requires_backup_sensei || false,
    backup_assignment_deadline: data.backup_assignment_deadline || null,
    replacement_needed: data.replacement_needed || null,
    cancelled_by_sensei: data.cancelled_by_sensei || null,
    cancellation_reason: data.cancellation_reason || null,
    cancelled_at: data.cancelled_at || null,
    created_at: data.created_at || new Date().toISOString(),
    updated_at: data.updated_at || new Date().toISOString(),
  };
};

// Transforms array of raw data to Trip array with validation
export const transformToTripArray = (data: any[]): Trip[] => {
  return (data || []).map(item => {
    if (isValidTripData(item)) {
      return transformDbTrip(item);
    } else {
      return createMinimalTrip(item);
    }
  });
};

// Creates mock trip data for testing/development
export const createMockTrip = (overrides: Partial<Trip> = {}): Trip => {
  return createMinimalTrip({
    id: '1',
    title: 'Meditation Retreat',
    theme: 'Wellness',
    dates: 'June 15-22, 2024',
    sensei_id: '1',
    destination: 'Bali',
    description: 'A peaceful meditation retreat in Bali',
    start_date: '2024-06-15',
    end_date: '2024-06-22',
    duration_days: 7,
    price: '$1,299',
    group_size: '8-12 people',
    max_participants: 12,
    current_participants: 5,
    sensei_name: 'Maria Zen',
    image_url: '/placeholder.svg',
    trip_status: 'approved',
    is_active: true,
    rating: 4.8,
    difficulty_level: 'Easy',
    ...overrides
  });
};