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

export const useSenseiPermissions = (senseiId?: string) => {
  const [permissions, setPermissions] = useState<SenseiPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPermissions = async () => {
    if (!senseiId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .rpc('get_sensei_permissions', { p_sensei_id: senseiId });

      if (error) throw error;
      
      console.log('Raw permissions data:', data);
      
      // The RPC function returns the permissions object directly
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

  return {
    permissions,
    isLoading,
    validateAction,
    canEditField,
    refreshPermissions: fetchPermissions
  };
};