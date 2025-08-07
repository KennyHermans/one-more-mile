import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PermissionValidationResult {
  canPerformAction: boolean;
  senseiLevel: string | null;
  requiredLevel?: string;
  missingPermissions: string[];
  fieldPermissions: Record<string, { canView: boolean; canEdit: boolean; requiredLevel?: string }>;
}

interface ValidationContext {
  userId?: string;
  senseiId?: string;
  tripId?: string;
  action?: string;
  fieldName?: string;
}

export const usePermissionValidator = () => {
  const [cachedPermissions, setCachedPermissions] = useState<Map<string, any>>(new Map());
  const [isValidating, setIsValidating] = useState(false);
  const { toast } = useToast();

  // Clear cache when needed
  const clearPermissionCache = useCallback((pattern?: string) => {
    if (pattern) {
      const newCache = new Map();
      for (const [key, value] of cachedPermissions.entries()) {
        if (!key.includes(pattern)) {
          newCache.set(key, value);
        }
      }
      setCachedPermissions(newCache);
    } else {
      setCachedPermissions(new Map());
    }
  }, [cachedPermissions]);

  // Validate sensei permissions with caching
  const validateSenseiPermissions = useCallback(async (
    context: ValidationContext
  ): Promise<PermissionValidationResult> => {
    if (!context.senseiId) {
      return {
        canPerformAction: false,
        senseiLevel: null,
        missingPermissions: ['sensei_id_required'],
        fieldPermissions: {}
      };
    }

    const cacheKey = `sensei_${context.senseiId}_${context.action || 'general'}_${context.fieldName || 'all'}`;
    
    // Check cache first
    if (cachedPermissions.has(cacheKey)) {
      return cachedPermissions.get(cacheKey);
    }

    setIsValidating(true);
    try {
      // Get comprehensive sensei permissions
      const { data: permissionsData, error: permissionsError } = await supabase
        .rpc('get_sensei_permissions', { p_sensei_id: context.senseiId });

      if (permissionsError) throw permissionsError;

      // Get field-specific permissions if needed
      let fieldPermissions = {};
      if (context.fieldName) {
        const { data: fieldData, error: fieldError } = await supabase
          .rpc('get_sensei_field_permissions', {
            p_sensei_id: context.senseiId,
            p_field_name: context.fieldName
          });

        if (!fieldError && fieldData) {
          const result = fieldData as any;
          fieldPermissions = {
            [context.fieldName]: {
              canView: result.can_view || false,
              canEdit: result.can_edit || false,
              requiredLevel: result.required_level
            }
          };
        }
      } else {
        // Get all field permissions
        const { data: allFieldData, error: allFieldError } = await supabase
          .rpc('get_sensei_field_permissions', { p_sensei_id: context.senseiId });

        if (!allFieldError && allFieldData) {
          const result = allFieldData as any;
          fieldPermissions = result.field_permissions || {};
        }
      }

      // Validate specific action if provided
      let canPerformAction = true;
      const missingPermissions: string[] = [];

      if (context.action && permissionsData) {
        const permissions = permissionsData as any;
        if (permissions.hasOwnProperty(context.action)) {
          canPerformAction = Boolean(permissions[context.action]);
          if (!canPerformAction) {
            missingPermissions.push(context.action);
          }
        }
      }

      const permissions = permissionsData as any;
      const result: PermissionValidationResult = {
        canPerformAction,
        senseiLevel: permissions?.sensei_level || null,
        missingPermissions,
        fieldPermissions
      };

      // Cache the result
      setCachedPermissions(prev => new Map(prev.set(cacheKey, result)));
      
      return result;
    } catch (error) {
      console.error('Error validating sensei permissions:', error);
      toast({
        title: "Permission validation error",
        description: "Unable to verify permissions. Please try again.",
        variant: "destructive",
      });
      
      return {
        canPerformAction: false,
        senseiLevel: null,
        missingPermissions: ['validation_error'],
        fieldPermissions: {}
      };
    } finally {
      setIsValidating(false);
    }
  }, [cachedPermissions, toast]);

  // Validate trip-specific permissions
  const validateTripPermissions = useCallback(async (
    context: ValidationContext & { tripId: string }
  ): Promise<PermissionValidationResult> => {
    if (!context.senseiId || !context.tripId) {
      return {
        canPerformAction: false,
        senseiLevel: null,
        missingPermissions: ['sensei_id_or_trip_id_required'],
        fieldPermissions: {}
      };
    }

    const cacheKey = `trip_${context.tripId}_sensei_${context.senseiId}_${context.action || 'general'}`;
    
    if (cachedPermissions.has(cacheKey)) {
      return cachedPermissions.get(cacheKey);
    }

    setIsValidating(true);
    try {
      const { data, error } = await supabase
        .rpc('get_trip_edit_permissions', {
          p_sensei_id: context.senseiId,
          p_trip_id: context.tripId
        });

      if (error) throw error;

      let canPerformAction = true;
      const missingPermissions: string[] = [];

      if (context.action && data) {
        const permissions = data as any;
        if (permissions.hasOwnProperty(context.action)) {
          canPerformAction = Boolean(permissions[context.action]);
          if (!canPerformAction) {
            missingPermissions.push(context.action);
          }
        }
      }

      const permissions = data as any;
      const result: PermissionValidationResult = {
        canPerformAction,
        senseiLevel: permissions?.sensei_level || null,
        missingPermissions,
        fieldPermissions: permissions?.field_permissions || {}
      };

      setCachedPermissions(prev => new Map(prev.set(cacheKey, result)));
      
      return result;
    } catch (error) {
      console.error('Error validating trip permissions:', error);
      toast({
        title: "Permission validation error",
        description: "Unable to verify trip permissions. Please try again.",
        variant: "destructive",
      });
      
      return {
        canPerformAction: false,
        senseiLevel: null,
        missingPermissions: ['validation_error'],
        fieldPermissions: {}
      };
    } finally {
      setIsValidating(false);
    }
  }, [cachedPermissions, toast]);

  // Check if user can perform admin actions
  const validateAdminPermissions = useCallback(async (
    action: string
  ): Promise<boolean> => {
    const cacheKey = `admin_${action}`;
    
    if (cachedPermissions.has(cacheKey)) {
      return cachedPermissions.get(cacheKey);
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return false;

      const { data, error } = await supabase
        .from('admin_roles')
        .select('role, is_active')
        .eq('user_id', userData.user.id)
        .eq('is_active', true)
        .single();

      if (error) return false;

      // Define action-role mappings
      const actionRoleMap: Record<string, string[]> = {
        manage_senseis: ['admin', 'sensei_scout'],
        manage_trips: ['admin', 'journey_curator'],
        manage_finances: ['admin'],
        view_customers: ['admin', 'traveler_support'],
        manage_level_requirements: ['admin'],
        update_sensei_levels: ['admin', 'sensei_scout']
      };

      const allowedRoles = actionRoleMap[action] || ['admin'];
      const hasPermission = allowedRoles.includes(data.role);

      setCachedPermissions(prev => new Map(prev.set(cacheKey, hasPermission)));
      
      return hasPermission;
    } catch (error) {
      console.error('Error validating admin permissions:', error);
      return false;
    }
  }, [cachedPermissions]);

  // Real-time permission updates when sensei level changes
  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sensei_profiles',
          filter: 'sensei_level=neq.old.sensei_level'
        },
        (payload) => {
          // Clear cache for this sensei when level changes
          clearPermissionCache(`sensei_${payload.new.id}`);
          
          toast({
            title: "Permissions updated",
            description: "Sensei level changed. Permissions have been refreshed.",
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sensei_level_permissions'
        },
        () => {
          // Clear all permission cache when level permissions change
          clearPermissionCache();
          
          toast({
            title: "Permissions updated",
            description: "Level permissions have been updated.",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clearPermissionCache, toast]);

  return {
    validateSenseiPermissions,
    validateTripPermissions,
    validateAdminPermissions,
    isValidating,
    clearPermissionCache
  };
};