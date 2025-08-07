import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SenseiPermissions {
  can_view_trips: boolean;
  can_apply_backup: boolean;
  can_edit_profile: boolean;
  can_edit_trips: boolean;
  can_create_trips: boolean;
  can_use_ai_builder: boolean;
  can_publish_trips: boolean;
  can_modify_pricing: boolean;
  trip_edit_fields: string[];
}

export const useSenseiPermissions = (senseiId?: string, tripId?: string) => {
  const [permissions, setPermissions] = useState<SenseiPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentLevel, setCurrentLevel] = useState<string | null>(null);
  const [hasElevatedPermissions, setHasElevatedPermissions] = useState(false);
  const [elevatedLevel, setElevatedLevel] = useState<string | null>(null);

  const fetchPermissions = async () => {
    if (!senseiId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Fetch sensei level first
      const { data: senseiData, error: senseiError } = await supabase
        .from('sensei_profiles')
        .select('sensei_level')
        .eq('id', senseiId)
        .single();

      if (senseiError) throw senseiError;
      setCurrentLevel(senseiData.sensei_level);
      
      // Check for trip-specific elevated permissions if tripId is provided
      let hasElevation = false;
      let elevatedLevelValue = null;
      
      if (tripId) {
        // Use RPC call since table might not be in types yet
        const { data: permissionData, error: permError } = await supabase
          .rpc('get_sensei_permissions_for_trip', {
            p_sensei_id: senseiId,
            p_trip_id: tripId
          });

        if (permissionData && !permError) {
          const parsedData = typeof permissionData === 'string' 
            ? JSON.parse(permissionData) 
            : permissionData;
          
          if (parsedData.is_elevated) {
            hasElevation = true;
            elevatedLevelValue = parsedData.effective_level;
            setElevatedLevel(parsedData.effective_level);
            setPermissions(parsedData);
            setHasElevatedPermissions(true);
            return;
          }
        }
      }
      
      setHasElevatedPermissions(hasElevation);
      
      // Fetch permissions using base level if no elevation
      const { data, error } = await supabase
        .rpc('get_sensei_permissions', { p_sensei_id: senseiId });

      if (error) throw error;
      setPermissions(data as unknown as SenseiPermissions);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setPermissions(null);
    } finally {
      setIsLoading(false);
    }
  };

  const validateAction = async (action: string): Promise<boolean> => {
    if (!senseiId) return false;
    
    try {
      const { data, error } = await supabase
        .rpc('validate_sensei_action', {
          p_sensei_id: senseiId,
          p_action: action
        });
      
      if (error) throw error;
      return data || false;
    } catch (error) {
      console.error('Error validating action:', error);
      return false;
    }
  };

  const canEditField = (fieldName: string): boolean => {
    if (!permissions) return false;
    return permissions.trip_edit_fields.includes(fieldName);
  };

  useEffect(() => {
    fetchPermissions();
  }, [senseiId]);

  // Set up real-time listener for sensei profile updates
  useEffect(() => {
    if (!senseiId) return;

    const channel = supabase
      .channel('sensei-permissions-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sensei_profiles',
          filter: `id=eq.${senseiId}`
        },
        (payload) => {
          console.log('Sensei level updated, refreshing permissions:', payload);
          // Refresh permissions when sensei level changes
          if (payload.new && payload.new.sensei_level !== currentLevel) {
            fetchPermissions();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [senseiId, currentLevel]);

  return {
    permissions,
    isLoading,
    validateAction,
    canEditField,
    refreshPermissions: fetchPermissions,
    currentLevel,
    hasElevatedPermissions,
    elevatedLevel
  };
};