import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SenseiLevelBadge } from "@/components/ui/sensei-level-badge";
import { Trophy, Target, Star, TrendingUp, RefreshCw, CheckCircle, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMilestoneTracker } from "@/hooks/use-milestone-tracker";

interface EligibilityData {
  current_level: string;
  eligible_level: string;
  can_auto_upgrade: boolean;
  current_trips: number;
  current_rating: number;
  next_level?: {
    level_name: string;
    display_name: string;
    trips_required: number;
    rating_required: number;
    trips_progress: {
      current: number;
      required: number;
      percentage: number;
    };
    rating_progress: {
      current: number;
      required: number;
      percentage: number;
    };
  };
}

interface EnhancedSenseiProgressProps {
  senseiId: string;
}

export const EnhancedSenseiProgress = ({ senseiId }: EnhancedSenseiProgressProps) => {
  const [eligibilityData, setEligibilityData] = useState<EligibilityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { milestones, checkAndAwardMilestones } = useMilestoneTracker(senseiId);

  const fetchEligibilityData = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .rpc('check_sensei_level_eligibility', { p_sensei_id: senseiId });

      if (error) throw error;
      setEligibilityData(data as unknown as EligibilityData);
    } catch (error) {
      console.error('Error fetching eligibility data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (senseiId) {
      fetchEligibilityData();
    }
  }, [senseiId]);

  const handleCheckMilestones = async () => {
    await checkAndAwardMilestones();
    await fetchEligibilityData();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Enhanced Level Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!eligibilityData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Enhanced Level Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Unable to load progress data.</p>
        </CardContent>
      </Card>
    );
  }

  const currentLevel = eligibilityData.current_level as 'apprentice' | 'journey_guide' | 'master_sensei';
  const isMaxLevel = currentLevel === 'master_sensei' && !eligibilityData.next_level;
  
  if (isMaxLevel) {
    return (
      <Card className="border-accent">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Trophy className="h-8 w-8 text-accent" />
          </div>
          <CardTitle className="text-accent">Master Level Achieved!</CardTitle>
          <p className="text-muted-foreground">
            You've reached the highest sensei level with full platform access.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <SenseiLevelBadge level={currentLevel} size="lg" />
          </div>
          
          {/* Show recent milestones even at max level */}
          {milestones.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Recent Achievements:</h4>
              <div className="space-y-1">
                {milestones.slice(0, 3).map((milestone) => (
                  <div key={milestone.id} className="flex items-center gap-2 text-xs">
                    <span>{milestone.milestone_type === 'level_up' ? '👑' : '🏆'}</span>
                    <span className="text-muted-foreground">
                      {new Date(milestone.achieved_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!eligibilityData.next_level) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Enhanced Level Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center">
            <SenseiLevelBadge level={currentLevel} />
          </div>
        </CardContent>
      </Card>
    );
  }

  const nextLevel = eligibilityData.next_level;
  const overallProgress = (nextLevel.trips_progress.percentage + nextLevel.rating_progress.percentage) / 2;

  // Get milestone status
  const milestoneStatus = {
    progress_50: milestones.some(m => m.milestone_type === 'progress_50' && m.target_level === nextLevel.level_name),
    progress_75: milestones.some(m => m.milestone_type === 'progress_75' && m.target_level === nextLevel.level_name),
    progress_90: milestones.some(m => m.milestone_type === 'progress_90' && m.target_level === nextLevel.level_name),
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Enhanced Progress Tracking
        </CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleCheckMilestones}>
            <Zap className="h-3 w-3 mr-1" />
            Check Milestones
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Level */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Current Level</span>
          <SenseiLevelBadge level={currentLevel} />
        </div>

        {/* Next Level Target */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Next Level</span>
          <SenseiLevelBadge level={nextLevel.level_name as any} />
        </div>

        {/* Auto-upgrade notification */}
        {eligibilityData.can_auto_upgrade && (
          <div className="bg-accent/10 border border-accent/20 rounded-lg p-3">
            <p className="text-sm font-medium text-accent">
              🎉 You're eligible for automatic upgrade to {nextLevel.display_name}!
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Your level will be updated automatically in the next scheduled run.
            </p>
          </div>
        )}

        {/* Overall Progress with Milestone Indicators */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Progress</span>
            <Badge variant="outline">
              {Math.round(overallProgress)}%
            </Badge>
          </div>
          <Progress value={overallProgress} className="h-3" />
          
          {/* Milestone Indicators */}
          <div className="flex justify-between items-center">
            {[
              { percent: 50, icon: Target, key: 'progress_50' as const },
              { percent: 75, icon: Star, key: 'progress_75' as const },
              { percent: 90, icon: Trophy, key: 'progress_90' as const },
              { percent: 100, icon: CheckCircle, key: 'level_up' as const }
            ].map(({ percent, icon: Icon, key }) => {
              const isAchieved = key === 'level_up' ? eligibilityData.can_auto_upgrade : milestoneStatus[key];
              const isCurrent = !isAchieved && overallProgress >= percent - 10 && overallProgress < percent + 10;
              
              return (
                <div key={percent} className="flex flex-col items-center gap-1">
                  <div className={`p-1.5 rounded-full border ${
                    isAchieved 
                      ? 'bg-primary border-primary text-primary-foreground' 
                      : isCurrent
                      ? 'border-primary text-primary bg-primary/10'
                      : 'border-muted-foreground/30 text-muted-foreground'
                  }`}>
                    <Icon className="h-3 w-3" />
                  </div>
                  <span className={`text-xs ${
                    isAchieved ? 'text-primary font-medium' : 'text-muted-foreground'
                  }`}>
                    {percent}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detailed Progress */}
        <div className="space-y-4">
          {/* Trips Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Trips Completed</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {nextLevel.trips_progress.current} / {nextLevel.trips_progress.required}
              </span>
            </div>
            <Progress value={nextLevel.trips_progress.percentage} className="h-2" />
          </div>

          {/* Rating Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium">Average Rating</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {nextLevel.rating_progress.current.toFixed(1)} / {nextLevel.rating_progress.required.toFixed(1)}
              </span>
            </div>
            <Progress value={nextLevel.rating_progress.percentage} className="h-2" />
          </div>
        </div>

        {/* Next Level Benefits */}
        <div className="bg-muted/30 rounded-lg p-4 space-y-2">
          <h4 className="font-medium text-sm">Next Level Unlocks:</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            {nextLevel.level_name === 'journey_guide' && (
              <>
                <li>• Edit assigned trip details</li>
                <li>• Modify itineraries and requirements</li>
                <li>• Enhanced profile features</li>
                <li>• Access to AI trip builder</li>
              </>
            )}
            {nextLevel.level_name === 'master_sensei' && (
              <>
                <li>• Create and publish your own trips</li>
                <li>• Full pricing control</li>
                <li>• Advanced analytics dashboard</li>
                <li>• Priority support and opportunities</li>
              </>
            )}
          </ul>
        </div>

        {/* Recent Milestones */}
        {milestones.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Recent Milestones:</h4>
            <div className="space-y-1">
              {milestones.slice(0, 2).map((milestone) => (
                <div key={milestone.id} className="flex items-center gap-2 text-xs">
                  <span>{milestone.milestone_type === 'level_up' ? '👑' : '🎯'}</span>
                  <span>{milestone.progress_percentage}% Progress</span>
                  <span className="text-muted-foreground">
                    {new Date(milestone.achieved_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};