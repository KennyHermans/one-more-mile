import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SenseiProfile {
  id: string;
  name: string;
  email?: string;
  location: string;
  specialties: string[];
  sensei_level: string;
  rating: number;
  trips_led: number;
  is_active: boolean;
  is_offline: boolean;
  bio: string;
  experience: string;
  image_url?: string;
  level_achieved_at: string;
  created_at: string;
  updated_at: string;
  can_create_trips: boolean;
  trip_creation_requested: boolean;
  user_id: string;
}

interface SenseiApplication {
  id: string;
  full_name: string;
  email: string;
  status: string;
  created_at: string;
  expertise_areas: string[];
  location: string;
  years_experience: number;
  user_id: string;
}

export const useAdminSenseiManagement = () => {
  const [senseis, setSenseis] = useState<SenseiProfile[]>([]);
  const [applications, setApplications] = useState<SenseiApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch all senseis with comprehensive data
  const fetchSenseis = useCallback(async () => {
    try {
      setError(null);
      const { data, error } = await supabase
        .from('sensei_profiles')
        .select(`
          *,
          sensei_level_history(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSenseis(data as SenseiProfile[] || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch senseis';
      setError(errorMessage);
      toast({
        title: "Error fetching senseis",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [toast]);

  // Fetch sensei applications
  const fetchApplications = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data as SenseiApplication[] || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch applications';
      setError(errorMessage);
      toast({
        title: "Error fetching applications",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [toast]);

  // Update sensei level using the new database function
  const updateSenseiLevel = useCallback(async (
    senseiId: string, 
    newLevel: string,
    reason?: string
  ) => {
    try {
      const { data, error } = await supabase.rpc('admin_update_sensei_level', {
        p_sensei_id: senseiId,
        p_new_level: newLevel,
        p_reason: reason
      });

      if (error) throw error;

      const result = data as any;
      if (result?.error) {
        throw new Error(result.error);
      }

      if (result?.success) {
        toast({
          title: "Sensei level updated",
          description: `Successfully updated to ${newLevel}`,
        });
        await fetchSenseis(); // Refresh data
        return { success: true, data: result };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update sensei level';
      toast({
        title: "Error updating sensei level",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    }
  }, [fetchSenseis, toast]);

  // Toggle sensei active status
  const toggleSenseiStatus = useCallback(async (senseiId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('sensei_profiles')
        .update({ 
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', senseiId);

      if (error) throw error;

      toast({
        title: `Sensei ${isActive ? 'activated' : 'deactivated'}`,
        description: "Status updated successfully",
      });
      await fetchSenseis();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update sensei status';
      toast({
        title: "Error updating status",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [fetchSenseis, toast]);

  // Approve/reject application
  const updateApplicationStatus = useCallback(async (
    applicationId: string, 
    status: 'approved' | 'rejected'
  ) => {
    try {
      const { error } = await supabase
        .from('applications')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      if (error) throw error;

      toast({
        title: `Application ${status}`,
        description: "Application status updated successfully",
      });
      await fetchApplications();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update application';
      toast({
        title: "Error updating application",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [fetchApplications, toast]);

  // Get sensei permissions
  const getSenseiPermissions = useCallback(async (senseiId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_sensei_permissions', {
        p_sensei_id: senseiId
      });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error fetching sensei permissions:', err);
      return null;
    }
  }, []);

  // Initialize data loading
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchSenseis(), fetchApplications()]);
      setIsLoading(false);
    };

    loadData();
  }, [fetchSenseis, fetchApplications]);

  return {
    senseis,
    applications,
    isLoading,
    error,
    updateSenseiLevel,
    toggleSenseiStatus,
    updateApplicationStatus,
    getSenseiPermissions,
    refreshSenseis: fetchSenseis,
    refreshApplications: fetchApplications,
  };
};