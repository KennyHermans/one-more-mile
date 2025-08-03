import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TripPermissions {
  title: boolean;
  description: boolean;
  destination: boolean;
  theme: boolean;
  dates: boolean;
  price: boolean;
  group_size: boolean;
  included_amenities: boolean;
  excluded_items: boolean;
  requirements: boolean;
  program: boolean;
}

export const useTripPermissions = (senseiId?: string, tripId?: string) => {
  const [permissions, setPermissions] = useState<TripPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTripPermissions = async () => {
    if (!senseiId || !tripId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('trip_permissions')
        .select('permissions')
        .eq('sensei_id', senseiId)
        .eq('trip_id', tripId)
        .single();

      if (error) {
        console.error('Error fetching trip permissions:', error);
        setPermissions(null);
      } else {
        setPermissions(data?.permissions as unknown as TripPermissions);
      }
    } catch (error) {
      console.error('Error fetching trip permissions:', error);
      setPermissions(null);
    } finally {
      setIsLoading(false);
    }
  };

  const canEditField = (fieldName: keyof TripPermissions): boolean => {
    if (!permissions) return false;
    return permissions[fieldName] === true;
  };

  useEffect(() => {
    fetchTripPermissions();
  }, [senseiId, tripId]);

  return {
    permissions,
    isLoading,
    canEditField,
    refreshPermissions: fetchTripPermissions
  };
};