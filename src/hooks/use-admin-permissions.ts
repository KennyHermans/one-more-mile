import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfileManagement } from './use-profile-management';

export type PlatformRole = 'admin' | 'journey_curator' | 'sensei_scout' | 'traveler_support' | 'partner';

export interface AdminPermissions {
  canManageTrips: boolean;
  canManageSenseis: boolean;
  canViewCustomers: boolean;
  canManageFinances: boolean;
  userRole: PlatformRole | null;
}

export const useAdminPermissions = () => {
  const [permissions, setPermissions] = useState<AdminPermissions>({
    canManageTrips: false,
    canManageSenseis: false,
    canViewCustomers: false,
    canManageFinances: false,
    userRole: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useProfileManagement();

  const checkPermissions = async () => {
    if (!user) {
      setPermissions({
        canManageTrips: false,
        canManageSenseis: false,
        canViewCustomers: false,
        canManageFinances: false,
        userRole: null,
      });
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Get user role
      const { data: roleData } = await supabase.rpc('get_user_platform_role', {
        user_id: user.id
      });

      // Check permissions
      const [tripsResult, senseisResult, customersResult, financesResult] = await Promise.all([
        supabase.rpc('can_manage_trips', { user_id: user.id }),
        supabase.rpc('can_manage_senseis', { user_id: user.id }),
        supabase.rpc('can_view_customers', { user_id: user.id }),
        supabase.rpc('can_manage_finances', { user_id: user.id }),
      ]);

      setPermissions({
        canManageTrips: tripsResult.data === true,
        canManageSenseis: senseisResult.data === true,
        canViewCustomers: customersResult.data === true,
        canManageFinances: financesResult.data === true,
        userRole: roleData as PlatformRole,
      });
    } catch (error) {
      console.error('Error checking permissions:', error);
      setPermissions({
        canManageTrips: false,
        canManageSenseis: false,
        canViewCustomers: false,
        canManageFinances: false,
        userRole: null,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkPermissions();
  }, [user]);

  return {
    permissions,
    isLoading,
    refreshPermissions: checkPermissions,
  };
};