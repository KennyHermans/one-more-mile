import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Trip, transformDbTrip } from '@/types/trip';

interface TripCreateData {
  title: string;
  destination: string;
  theme: string;
  dates: string;
  price: number;
  max_participants: number;
  description: string;
  duration_days: number;
  sensei_id?: string;
  difficulty_level?: string;
  includes: string[];
  excludes: string[];
  what_to_bring: string[];
  program: any[];
  images: string[];
  trip_status: string;
  is_active: boolean;
}

interface TripFilters {
  status?: string;
  theme?: string;
  sensei_id?: string;
  search?: string;
}

export const useAdminTripManagement = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [senseis, setSenseis] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch all trips with comprehensive data
  const fetchTrips = useCallback(async (filters?: TripFilters) => {
    try {
      setError(null);
      let query = supabase
        .from('trips')
        .select(`
          *,
          sensei_profiles!trips_sensei_id_fkey(id, name, sensei_level, image_url),
          backup_sensei:sensei_profiles!trips_backup_sensei_id_fkey(id, name, sensei_level),
          trip_bookings(id, payment_status, user_id),
          trip_reviews(id, rating, review_text)
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('trip_status', filters.status);
      }
      if (filters?.theme && filters.theme !== 'all') {
        query = query.eq('theme', filters.theme);
      }
      if (filters?.sensei_id && filters.sensei_id !== 'all') {
        query = query.eq('sensei_id', filters.sensei_id);
      }
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,destination.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform data consistently
      const transformedTrips = data?.map(trip => {
        try {
          return transformDbTrip(trip);
        } catch (transformError) {
          console.error('Error transforming trip:', trip.id, transformError);
          // Return a safe fallback
          return transformDbTrip(trip) as Trip;
        }
      }) || [];

      setTrips(transformedTrips);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch trips';
      setError(errorMessage);
      toast({
        title: "Error fetching trips",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [toast]);

  // Fetch senseis for assignment
  const fetchSenseis = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('sensei_profiles')
        .select('id, name, sensei_level, location, specialties, is_active, rating')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setSenseis(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch senseis';
      setError(errorMessage);
    }
  }, []);

  // Create new trip with validation
  const createTrip = useCallback(async (tripData: TripCreateData) => {
    try {
      setError(null);

      // Validate required fields
      if (!tripData.title || !tripData.destination || !tripData.dates) {
        throw new Error('Title, destination, and dates are required');
      }

      const { data, error } = await supabase
        .from('trips')
        .insert([tripData as any])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Trip created",
        description: "Trip has been successfully created",
      });

      await fetchTrips(); // Refresh trips list
      return { success: true, data };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create trip';
      setError(errorMessage);
      toast({
        title: "Error creating trip",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    }
  }, [fetchTrips, toast]);

  // Update trip with validation
  const updateTrip = useCallback(async (tripId: string, updates: Partial<TripCreateData>) => {
    try {
      setError(null);

      const { data, error } = await supabase
        .from('trips')
        .update(updates as any)
        .eq('id', tripId)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Trip updated",
        description: "Trip has been successfully updated",
      });

      await fetchTrips(); // Refresh trips list
      return { success: true, data };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update trip';
      setError(errorMessage);
      toast({
        title: "Error updating trip",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    }
  }, [fetchTrips, toast]);

  // Delete trip with RLS-aware error handling
  const deleteTrip = useCallback(async (tripId: string) => {
    try {
      setError(null);

      // First check if user is authenticated and has admin privileges
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in to delete trips');
      }

      // Check admin status
      const { data: isAdminResult, error: adminError } = await supabase.rpc('is_admin', {
        user_id: user.id
      });

      if (adminError) {
        throw new Error(`Authentication check failed: ${adminError.message}`);
      }

      if (!isAdminResult) {
        throw new Error('You must be an admin to delete trips');
      }

      const { data, error, count } = await supabase
        .from('trips')
        .delete({ count: 'exact' })
        .eq('id', tripId);

      if (error) throw error;

      // Check if any rows were actually deleted
      if (count === 0) {
        throw new Error('Trip not found or you do not have permission to delete it');
      }

      toast({
        title: "Trip deleted",
        description: "Trip has been successfully deleted",
      });

      await fetchTrips(); // Refresh trips list
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete trip';
      setError(errorMessage);
      toast({
        title: "Error deleting trip",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    }
  }, [fetchTrips, toast]);

  // Assign sensei to trip
  const assignSensei = useCallback(async (tripId: string, senseiId: string, isBackup = false) => {
    try {
      setError(null);

      const updateField = isBackup ? 'backup_sensei_id' : 'sensei_id';
      const { error } = await supabase
        .from('trips')
        .update({ 
          [updateField]: senseiId,
          updated_at: new Date().toISOString()
        })
        .eq('id', tripId);

      if (error) throw error;

      toast({
        title: `${isBackup ? 'Backup s' : 'S'}ensei assigned`,
        description: "Sensei has been successfully assigned to the trip",
      });

      await fetchTrips(); // Refresh trips list
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to assign sensei';
      setError(errorMessage);
      toast({
        title: "Error assigning sensei",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    }
  }, [fetchTrips, toast]);

  // Get trip permissions for a sensei
  const getTripPermissions = useCallback(async (senseiId: string, tripId?: string) => {
    try {
      const { data, error } = await supabase.rpc('get_trip_edit_permissions', {
        p_sensei_id: senseiId,
        p_trip_id: tripId
      });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error fetching trip permissions:', err);
      return null;
    }
  }, []);

  // Initialize data loading
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchTrips(), fetchSenseis()]);
      setIsLoading(false);
    };

    loadData();
  }, [fetchTrips, fetchSenseis]);

  return {
    trips,
    senseis,
    isLoading,
    error,
    fetchTrips,
    createTrip,
    updateTrip,
    deleteTrip,
    assignSensei,
    getTripPermissions,
    refreshTrips: fetchTrips,
    refreshSenseis: fetchSenseis,
  };
};