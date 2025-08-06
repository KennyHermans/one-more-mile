import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MilestoneAchievement {
  id: string;
  sensei_id: string;
  milestone_type: string;
  target_level: string;
  progress_percentage: number;
  achieved_at: string;
  metadata: any;
}

interface MilestoneProgress {
  current_percentage: number;
  milestones_achieved: MilestoneAchievement[];
  next_milestone: {
    type: string;
    percentage: number;
    target_level: string;
  } | null;
}

export const useMilestoneTracker = (senseiId?: string) => {
  const [milestones, setMilestones] = useState<MilestoneAchievement[]>([]);
  const [progress, setProgress] = useState<MilestoneProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchMilestones = async () => {
    if (!senseiId) return;

    try {
      setIsLoading(true);

      // Fetch achieved milestones
      const { data: milestoneData, error: milestoneError } = await supabase
        .from('milestone_achievements')
        .select('*')
        .eq('sensei_id', senseiId)
        .order('achieved_at', { ascending: false });

      if (milestoneError) throw milestoneError;
      setMilestones(milestoneData || []);

      // Get current level eligibility to calculate progress
      const { data: eligibilityData, error: eligibilityError } = await supabase
        .rpc('check_sensei_level_eligibility', { p_sensei_id: senseiId });

      if (eligibilityError) throw eligibilityError;

      const eligibility = eligibilityData as any;
      if (eligibility?.next_level) {
        const currentProgress = (
          (eligibility.next_level.trips_progress.percentage + 
           eligibility.next_level.rating_progress.percentage) / 2
        );

        // Determine next milestone
        let nextMilestone = null;
        if (currentProgress < 50) {
          nextMilestone = {
            type: 'progress_50',
            percentage: 50,
            target_level: eligibility.next_level.level_name
          };
        } else if (currentProgress < 75) {
          nextMilestone = {
            type: 'progress_75',
            percentage: 75,
            target_level: eligibility.next_level.level_name
          };
        } else if (currentProgress < 90) {
          nextMilestone = {
            type: 'progress_90',
            percentage: 90,
            target_level: eligibility.next_level.level_name
          };
        } else if (currentProgress >= 100) {
          nextMilestone = {
            type: 'level_up',
            percentage: 100,
            target_level: eligibility.next_level.level_name
          };
        }

        setProgress({
          current_percentage: currentProgress,
          milestones_achieved: milestoneData || [],
          next_milestone: nextMilestone
        });
      }

    } catch (error) {
      console.error('Error fetching milestones:', error);
      toast({
        title: "Error",
        description: "Failed to load milestone progress",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkAndAwardMilestones = async () => {
    if (!senseiId) return;

    try {
      const { error } = await supabase
        .rpc('check_and_award_milestones', { p_sensei_id: senseiId });

      if (error) throw error;

      // Refresh milestones after checking
      await fetchMilestones();
    } catch (error) {
      console.error('Error checking milestones:', error);
      toast({
        title: "Error",
        description: "Failed to check milestone achievements",
        variant: "destructive"
      });
    }
  };

  const getMilestoneIcon = (milestoneType: string) => {
    switch (milestoneType) {
      case 'progress_50':
        return '🎯';
      case 'progress_75':
        return '⭐';
      case 'progress_90':
        return '🔥';
      case 'level_up':
        return '👑';
      default:
        return '🏆';
    }
  };

  const getMilestoneTitle = (milestoneType: string, targetLevel: string) => {
    switch (milestoneType) {
      case 'progress_50':
        return `Halfway to ${targetLevel.replace('_', ' ')}!`;
      case 'progress_75':
        return `75% Progress to ${targetLevel.replace('_', ' ')}!`;
      case 'progress_90':
        return `Almost there! 90% to ${targetLevel.replace('_', ' ')}!`;
      case 'level_up':
        return `Level Up! Welcome to ${targetLevel.replace('_', ' ')}!`;
      default:
        return 'Milestone Achieved!';
    }
  };

  const getMilestoneColor = (milestoneType: string) => {
    switch (milestoneType) {
      case 'progress_50':
        return 'hsl(var(--primary))';
      case 'progress_75':
        return 'hsl(var(--accent))';
      case 'progress_90':
        return 'hsl(var(--destructive))';
      case 'level_up':
        return 'hsl(var(--accent))';
      default:
        return 'hsl(var(--muted))';
    }
  };

  useEffect(() => {
    fetchMilestones();
  }, [senseiId]);

  return {
    milestones,
    progress,
    isLoading,
    checkAndAwardMilestones,
    getMilestoneIcon,
    getMilestoneTitle,
    getMilestoneColor,
    refreshMilestones: fetchMilestones
  };
};