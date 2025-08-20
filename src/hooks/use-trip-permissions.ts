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
  current_participants: boolean;
  included_amenities: boolean;
  excluded_items: boolean;
  requirements: boolean;
  program: boolean;
}

export const useTripPermissions = (senseiId?: string, tripId?: string) => {
  const [permissions, setPermissions] = useState<TripPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTripPermissions = async () => {
    if (!senseiId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      let tripPermData: any = null;
      if (tripId) {
        // Try to get individual trip permissions when a specific trip is provided
        const { data, error } = await supabase
          .from('trip_permissions')
          .select('permissions')
          .eq('sensei_id', senseiId)
          .eq('trip_id', tripId)
          .maybeSingle();

        if (error && (error as any).code !== 'PGRST116') {
          console.error('Error fetching trip permissions:', error);
        }
        tripPermData = data;
      }

      // If no individual permissions found OR we're creating a new trip (no tripId), get level-based defaults
      if (!tripPermData?.permissions) {
        const { data: senseiData, error: senseiError } = await supabase
          .from('sensei_profiles')
          .select('sensei_level')
          .eq('id', senseiId)
          .maybeSingle();

        if (senseiError) {
          console.error('Error fetching sensei level:', senseiError);
          setPermissions(null);
          return;
        }

        // Get level-based field permissions
        const { data: fieldPermissions, error: fieldError } = await supabase
          .from('sensei_level_field_permissions')
          .select('field_name, can_edit')
          .eq('sensei_level', senseiData?.sensei_level);

        if (fieldError) {
          console.error('Error fetching field permissions:', fieldError);
          setPermissions(null);
          return;
        }

        // Convert field permissions to TripPermissions format
        const levelPermissions: TripPermissions = {
          title: false,
          description: false,
          destination: false,
          theme: false,
          dates: false,
          price: false,
          group_size: false,
          current_participants: false,
          included_amenities: false,
          excluded_items: false,
          requirements: false,
          program: false,
        };

        fieldPermissions?.forEach((perm: any) => {
          if (perm.field_name in levelPermissions) {
            (levelPermissions as any)[perm.field_name] = perm.can_edit;
          }
        });

        setPermissions(levelPermissions);
      } else {
        setPermissions(tripPermData.permissions as unknown as TripPermissions);
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