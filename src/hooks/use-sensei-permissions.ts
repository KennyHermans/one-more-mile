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
      
      // Fetch sensei profile data
      const { data: senseiData, error: senseiError } = await supabase
        .from('sensei_profiles')
        .select('sensei_level, can_create_trips')
        .eq('id', senseiId)
        .single();

      if (senseiError) throw senseiError;
      setCurrentLevel(senseiData.sensei_level);
      
      // Check for trip-specific elevated permissions if tripId is provided
      let hasElevation = false;
      let elevatedLevelValue = null;
      
      if (tripId) {
        // Use RPC call for trip-specific permissions
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
      
      // Fetch level-based permissions and prioritize them over profile flags
      const { data: levelPermissions, error: levelError } = await supabase
        .from('sensei_level_permissions')
        .select('*')
        .eq('sensei_level', senseiData.sensei_level)
        .single();

      if (levelError) {
        console.error('Error fetching level permissions:', levelError);
        // Fallback to RPC call
        const { data, error } = await supabase
          .rpc('get_sensei_permissions', { p_sensei_id: senseiId });

        if (error) throw error;
        setPermissions(data as unknown as SenseiPermissions);
        return;
      }

      // Fetch field permissions for the sensei level
      const { data: fieldPermissions, error: fieldError } = await supabase
        .from('sensei_level_field_permissions')
        .select('field_name')
        .eq('sensei_level', senseiData.sensei_level)
        .eq('can_edit', true);

      const editableFields = fieldPermissions?.map(fp => fp.field_name) || [];

      // Combine level-based permissions with some profile-specific overrides if needed
      const combinedPermissions: SenseiPermissions = {
        can_view_trips: levelPermissions.can_view_trips,
        can_apply_backup: levelPermissions.can_apply_backup,
        can_edit_profile: levelPermissions.can_edit_profile,
        can_edit_trips: levelPermissions.can_edit_trips,
        can_create_trips: levelPermissions.can_create_trips, // Prioritize level permissions
        can_use_ai_builder: levelPermissions.can_use_ai_builder,
        can_publish_trips: levelPermissions.can_publish_trips,
        can_modify_pricing: levelPermissions.can_modify_pricing,
        trip_edit_fields: editableFields
      };

      setPermissions(combinedPermissions);
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