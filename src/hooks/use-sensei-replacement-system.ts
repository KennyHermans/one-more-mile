import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReplacementRequest {
  tripId: string;
  currentSenseiId: string;
  newSenseiId: string;
  reason?: string;
}

export const useSenseiReplacementSystem = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSenseiReplacement = async (request: ReplacementRequest) => {
    setIsProcessing(true);
    
    try {
      // Get trip details and current sensei level
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select(`
          id, 
          title, 
          required_permission_level,
          created_by_sensei_level,
          sensei_profiles!inner(sensei_level)
        `)
        .eq('id', request.tripId)
        .single();

      if (tripError) throw tripError;

      // Get new sensei level
      const { data: newSenseiData, error: newSenseiError } = await supabase
        .from('sensei_profiles')
        .select('sensei_level')
        .eq('id', request.newSenseiId)
        .single();

      if (newSenseiError) throw newSenseiError;

      const currentSenseiLevel = tripData.sensei_profiles.sensei_level;
      const newSenseiLevel = newSenseiData.sensei_level;
      const requiredLevel = tripData.required_permission_level || tripData.created_by_sensei_level || currentSenseiLevel;

      // Define level hierarchy for comparison
      const levelHierarchy = {
        'apprentice': 1,
        'journey_guide': 2,
        'master_sensei': 3
      };

      const needsElevation = levelHierarchy[newSenseiLevel as keyof typeof levelHierarchy] < 
                            levelHierarchy[requiredLevel as keyof typeof levelHierarchy];

      // Update trip assignment
      const { error: updateError } = await supabase
        .from('trips')
        .update({ 
          sensei_id: request.newSenseiId,
          backup_sensei_id: null // Clear backup since we're replacing primary
        })
        .eq('id', request.tripId);

      if (updateError) throw updateError;

      // Grant elevated permissions if needed
      if (needsElevation) {
        const { error: permissionError } = await supabase
          .from('trip_specific_permissions')
          .insert({
            trip_id: request.tripId,
            sensei_id: request.newSenseiId,
            elevated_level: requiredLevel,
            granted_reason: `Temporary elevation for replacement sensei. Original level: ${newSenseiLevel}, Required: ${requiredLevel}`,
            granted_by: null, // System-granted
            is_active: true
          });

        if (permissionError) throw permissionError;

        toast.success(
          `Sensei replacement successful! ${newSenseiData.sensei_level} sensei has been granted temporary ${requiredLevel} permissions for this trip.`
        );
      } else {
        toast.success('Sensei replacement completed successfully!');
      }

      // Log the replacement for audit purposes
      const { error: logError } = await supabase
        .from('admin_audit_log')
        .insert({
          admin_user_id: null, // System action
          action: 'sensei_replacement',
          table_name: 'trips',
          record_id: request.tripId,
          old_values: { sensei_id: request.currentSenseiId },
          new_values: { sensei_id: request.newSenseiId },
          metadata: {
            reason: request.reason,
            elevated_permissions: needsElevation,
            original_level: newSenseiLevel,
            required_level: requiredLevel
          }
        });

      if (logError) console.warn('Failed to log replacement action:', logError);

      return { success: true, elevated: needsElevation };

    } catch (error) {
      console.error('Error handling sensei replacement:', error);
      toast.error('Failed to process sensei replacement');
      return { success: false, elevated: false };
    } finally {
      setIsProcessing(false);
    }
  };

  const checkPermissionCompatibility = async (tripId: string, senseiId: string) => {
    try {
      const { data: tripData } = await supabase
        .from('trips')
        .select('required_permission_level, created_by_sensei_level')
        .eq('id', tripId)
        .single();

      const { data: senseiData } = await supabase
        .from('sensei_profiles')
        .select('sensei_level')
        .eq('id', senseiId)
        .single();

      if (!tripData || !senseiData) return { compatible: false, needsElevation: false };

      const requiredLevel = tripData.required_permission_level || tripData.created_by_sensei_level || 'apprentice';
      const senseiLevel = senseiData.sensei_level;

      const levelHierarchy = {
        'apprentice': 1,
        'journey_guide': 2,
        'master_sensei': 3
      };

      const compatible = levelHierarchy[senseiLevel as keyof typeof levelHierarchy] >= 
                        levelHierarchy[requiredLevel as keyof typeof levelHierarchy];

      return {
        compatible,
        needsElevation: !compatible,
        senseiLevel,
        requiredLevel
      };
    } catch (error) {
      console.error('Error checking permission compatibility:', error);
      return { compatible: false, needsElevation: false };
    }
  };

  return {
    handleSenseiReplacement,
    checkPermissionCompatibility,
    isProcessing
  };
};