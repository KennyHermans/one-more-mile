import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { SenseiLevelBadge } from "@/components/ui/sensei-level-badge";
import { Trophy, Target, Star, TrendingUp } from "lucide-react";

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

interface SenseiLevelProgressProps {
  currentLevel: 'apprentice' | 'journey_guide' | 'master_sensei';
  nextLevel?: 'journey_guide' | 'master_sensei';
  progress: LevelProgress | null;
  isMaxLevel?: boolean;
}

export const SenseiLevelProgress = ({ 
  currentLevel, 
  nextLevel, 
  progress, 
  isMaxLevel = false 
}: SenseiLevelProgressProps) => {
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

  if (!progress || !nextLevel) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Level Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center">
            <SenseiLevelBadge level={currentLevel} />
          </div>
        </CardContent>
      </Card>
    );
  }

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
          <SenseiLevelBadge level={nextLevel} />
        </div>

        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Progress</span>
            <Badge variant="outline">
              {Math.round(progress.overall)}%
            </Badge>
          </div>
          <Progress value={progress.overall} className="h-3" />
        </div>

        {/* Trips Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Trips Completed</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {progress.trips.current} / {progress.trips.required}
            </span>
          </div>
          <Progress value={progress.trips.percentage} className="h-2" />
        </div>

        {/* Rating Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium">Average Rating</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {progress.rating.current.toFixed(1)} / {progress.rating.required.toFixed(1)}
            </span>
          </div>
          <Progress value={progress.rating.percentage} className="h-2" />
        </div>

        {/* Next Level Benefits */}
        <div className="bg-muted/30 rounded-lg p-4 space-y-2">
          <h4 className="font-medium text-sm">Next Level Unlocks:</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            {nextLevel === 'journey_guide' && (
              <>
                <li>• Edit assigned trip details</li>
                <li>• Modify itineraries and requirements</li>
                <li>• Enhanced profile features</li>
              </>
            )}
            {nextLevel === 'master_sensei' && (
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