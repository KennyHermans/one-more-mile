import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSenseiLevel } from '@/contexts/SenseiLevelContext';
import { useToast } from '@/hooks/use-toast';

interface SenseiLevel {
  eligible_level: 'apprentice' | 'journey_guide' | 'master_sensei';
  requirements_met: any;
  next_level_requirements: any;
}

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

interface Achievement {
  id: string;
  achievement_type: string;
  achievement_name: string;
  achievement_description: string;
  unlocked_at: string;
  metadata: any;
}

export const useSenseiGamification = (senseiId?: string) => {
  const [level, setLevel] = useState<SenseiLevel | null>(null);
  const [permissions, setPermissions] = useState<SenseiPermissions | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [levelHistory, setLevelHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentLevel, lastLevelChange } = useSenseiLevel();
  const { toast } = useToast();

  const fetchLevelData = async () => {
    if (!senseiId) return;
    
    try {
      setIsLoading(true);
      
      // Get actual current level from sensei profile
      const { data: profileData, error: profileError } = await supabase
        .from('sensei_profiles')
        .select('sensei_level, level_achieved_at, level_requirements_met, trips_led, rating')
        .eq('id', senseiId)
        .single();
      
      if (profileError) throw profileError;
      
      // Get level eligibility for next level progress
      const { data: levelData, error: levelError } = await supabase
        .rpc('calculate_sensei_level_eligibility', { p_sensei_id: senseiId });
      
      if (levelError) throw levelError;
      
      // Combine current level with eligibility data
      if (profileData) {
        const eligibilityData = levelData as any;
        setLevel({
          eligible_level: (profileData.sensei_level as 'apprentice' | 'journey_guide' | 'master_sensei') || 'apprentice',
          requirements_met: profileData.level_requirements_met || {},
          next_level_requirements: eligibilityData?.next_level || {}
        });
      }

      // Get permissions based on actual current level
      const { data: permissionsData, error: permissionsError } = await supabase
        .rpc('get_sensei_permissions', { p_sensei_id: senseiId });
      
      if (permissionsError) throw permissionsError;
      setPermissions(permissionsData as unknown as SenseiPermissions);

      // Get achievements
      const { data: achievementsData, error: achievementsError } = await supabase
        .from('sensei_achievements')
        .select('*')
        .eq('sensei_id', senseiId)
        .order('unlocked_at', { ascending: false });
      
      if (achievementsError) throw achievementsError;
      setAchievements(achievementsData || []);

      // Get level history
      const { data: historyData, error: historyError } = await supabase
        .from('sensei_level_history')
        .select('*')
        .eq('sensei_id', senseiId)
        .order('created_at', { ascending: false });
      
      if (historyError) throw historyError;
      setLevelHistory(historyData || []);
      
    } catch (error) {
      console.error('Error fetching gamification data:', error);
      toast({
        title: "Error",
        description: "Failed to load gamification data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const upgradeSenseiLevel = async (newLevel: 'apprentice' | 'journey_guide' | 'master_sensei', reason?: string) => {
    if (!senseiId) return false;
    
    try {
      const { data, error } = await supabase
        .rpc('upgrade_sensei_level', {
          p_sensei_id: senseiId,
          p_new_level: newLevel,
          p_reason: reason || 'Manual upgrade'
        });
      
      if (error) throw error;
      
      toast({
        title: "Level Updated",
        description: `Sensei level upgraded to ${newLevel.replace('_', ' ')}`,
      });
      
      // Refresh data
      await fetchLevelData();
      return true;
    } catch (error) {
      console.error('Error upgrading level:', error);
      toast({
        title: "Error",
        description: "Failed to upgrade sensei level",
        variant: "destructive"
      });
      return false;
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

  const getLevelDisplayName = (level: string) => {
    const names = {
      'apprentice': 'Apprentice Sensei',
      'journey_guide': 'Journey Guide',
      'master_sensei': 'Master Sensei'
    };
    return names[level as keyof typeof names] || level;
  };

  const getLevelColor = (level: string) => {
    const colors = {
      'apprentice': 'hsl(var(--muted))',
      'journey_guide': 'hsl(var(--primary))',
      'master_sensei': 'hsl(var(--accent))'
    };
    return colors[level as keyof typeof colors] || 'hsl(var(--muted))';
  };

  const getProgressToNextLevel = () => {
    if (!level?.next_level_requirements) return null;
    
    const req = level.next_level_requirements;
    const tripProgress = Math.min((req.current_trips / req.required_trips) * 100, 100);
    const ratingProgress = Math.min((req.current_rating / req.required_rating) * 100, 100);
    
    return {
      trips: {
        current: req.current_trips,
        required: req.required_trips,
        percentage: tripProgress
      },
      rating: {
        current: req.current_rating,
        required: req.required_rating,
        percentage: ratingProgress
      },
      overall: Math.min((tripProgress + ratingProgress) / 2, 100)
    };
  };

  useEffect(() => {
    fetchLevelData();
  }, [senseiId, currentLevel, lastLevelChange]);

  // Add a refresh effect when component mounts/becomes visible
  useEffect(() => {
    if (!senseiId) return;
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchLevelData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [senseiId]);

  return {
    level,
    permissions,
    achievements,
    levelHistory,
    isLoading,
    upgradeSenseiLevel,
    validateAction,
    getLevelDisplayName,
    getLevelColor,
    getProgressToNextLevel,
    refreshData: fetchLevelData
  };
};