import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { SenseiLevelBadge } from "@/components/ui/sensei-level-badge";
import { Trophy, Target, Star, TrendingUp, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface LevelProgress {
  trips: {
    current: number;
    required: number;
    percentage: number;
  };
  rating: {
    current: number;
    required: number;
    percentage: number;
  };
  overall: number;
}

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

interface SenseiLevelProgressProps {
  senseiId: string;
}

export const SenseiLevelProgress = ({ senseiId }: SenseiLevelProgressProps) => {
  const [eligibilityData, setEligibilityData] = useState<EligibilityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Level Progress
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
          <CardTitle>Level Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Unable to load level progress data.</p>
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
        <CardContent className="flex justify-center">
          <SenseiLevelBadge level={currentLevel} size="lg" />
        </CardContent>
      </Card>
    );
  }

  if (!eligibilityData.next_level) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Level Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center">
            <SenseiLevelBadge level={currentLevel} />
          </div>
          {isMaxLevel && (
            <p className="text-center text-muted-foreground mt-4">
              You've reached the highest sensei level!
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  const nextLevel = eligibilityData.next_level;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Progress to Next Level
        </CardTitle>
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
              Your level will be updated automatically based on your performance.
            </p>
          </div>
        )}

        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Progress</span>
            <Badge variant="outline">
              {Math.round((nextLevel.trips_progress.percentage + nextLevel.rating_progress.percentage) / 2)}%
            </Badge>
          </div>
          <Progress value={(nextLevel.trips_progress.percentage + nextLevel.rating_progress.percentage) / 2} className="h-3" />
        </div>

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

        {/* Next Level Benefits */}
        <div className="bg-muted/30 rounded-lg p-4 space-y-2">
          <h4 className="font-medium text-sm">Next Level Unlocks:</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            {nextLevel.level_name === 'journey_guide' && (
              <>
                <li>• Edit assigned trip details</li>
                <li>• Modify itineraries and requirements</li>
                <li>• Enhanced profile features</li>
              </>
            )}
            {nextLevel.level_name === 'master_sensei' && (
              <>
                <li>• Create and publish your own trips</li>
                <li>• Access AI trip builder</li>
                <li>• Full pricing control</li>
                <li>• Advanced analytics dashboard</li>
              </>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};