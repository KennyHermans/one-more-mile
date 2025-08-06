import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LevelRequirement {
  id: string;
  level_name: string;
  trips_required: number;
  rating_required: number;
  additional_criteria: any;
  is_active: boolean;
}

interface FieldPermission {
  id: string;
  sensei_level: string;
  field_category: string;
  field_name: string;
  can_view: boolean;
  can_edit: boolean;
  conditions: any;
}

interface MilestoneAchievement {
  id: string;
  sensei_id: string;
  milestone_type: string;
  target_level: string;
  progress_percentage: number;
  achieved_at: string;
  metadata: any;
}

export const useLevelRequirements = () => {
  const [requirements, setRequirements] = useState<LevelRequirement[]>([]);
  const [fieldPermissions, setFieldPermissions] = useState<FieldPermission[]>([]);
  const [milestones, setMilestones] = useState<MilestoneAchievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchRequirements = async () => {
    try {
      setIsLoading(true);
      
      // Fetch configurable level requirements
      const { data: reqData, error: reqError } = await supabase
        .from('configurable_level_requirements')
        .select('*')
        .order('trips_required');
      
      if (reqError) throw reqError;
      setRequirements(reqData || []);

      // Fetch field permissions configuration
      const { data: permData, error: permError } = await supabase
        .from('sensei_field_permissions_config')
        .select('*')
        .order('sensei_level, field_category, field_name');
      
      if (permError) throw permError;
      setFieldPermissions(permData || []);

    } catch (error) {
      console.error('Error fetching requirements:', error);
      toast({
        title: "Error",
        description: "Failed to load level requirements",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateRequirement = async (requirement: Partial<LevelRequirement> & { id: string }) => {
    try {
      const { error } = await supabase
        .from('configurable_level_requirements')
        .update({
          trips_required: requirement.trips_required,
          rating_required: requirement.rating_required,
          additional_criteria: requirement.additional_criteria,
          is_active: requirement.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', requirement.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Level requirement updated successfully"
      });

      await fetchRequirements();
      return true;
    } catch (error) {
      console.error('Error updating requirement:', error);
      toast({
        title: "Error",
        description: "Failed to update level requirement",
        variant: "destructive"
      });
      return false;
    }
  };

  const updateFieldPermission = async (permission: Partial<FieldPermission> & { id: string }) => {
    try {
      const { error } = await supabase
        .from('sensei_field_permissions_config')
        .update({
          can_view: permission.can_view,
          can_edit: permission.can_edit,
          conditions: permission.conditions,
          updated_at: new Date().toISOString()
        })
        .eq('id', permission.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Field permission updated successfully"
      });

      await fetchRequirements();
      return true;
    } catch (error) {
      console.error('Error updating field permission:', error);
      toast({
        title: "Error",
        description: "Failed to update field permission",
        variant: "destructive"
      });
      return false;
    }
  };

  const triggerManualUpgrade = async () => {
    try {
      const { data, error } = await supabase
        .rpc('enhanced_auto_upgrade_sensei_levels');

      if (error) throw error;

      const result = data as { upgrades_performed: number; success: boolean; timestamp: string; total_senseis_checked: number };

      toast({
        title: "Manual Upgrade Complete",
        description: `${result.upgrades_performed} senseis were upgraded`
      });

      return result;
    } catch (error) {
      console.error('Error triggering manual upgrade:', error);
      toast({
        title: "Error",
        description: "Failed to trigger manual upgrade",
        variant: "destructive"
      });
      return null;
    }
  };

  const testAutoUpgradeFunction = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('auto-upgrade-senseis', {
        body: { test_run: true }
      });

      if (error) throw error;

      toast({
        title: "Test Complete",
        description: "Auto-upgrade function test completed successfully"
      });

      return data;
    } catch (error) {
      console.error('Error testing auto-upgrade:', error);
      toast({
        title: "Error",
        description: "Failed to test auto-upgrade function",
        variant: "destructive"
      });
      return null;
    }
  };

  useEffect(() => {
    fetchRequirements();
  }, []);

  return {
    requirements,
    fieldPermissions,
    milestones,
    isLoading,
    updateRequirement,
    updateFieldPermission,
    triggerManualUpgrade,
    testAutoUpgradeFunction,
    refreshRequirements: fetchRequirements
  };
};