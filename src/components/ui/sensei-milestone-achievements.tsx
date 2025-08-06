import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useMilestoneTracker } from "@/hooks/use-milestone-tracker";
import { Trophy, Target, Star, Crown, CheckCircle, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface SenseiMilestoneAchievementsProps {
  senseiId: string;
}

export const SenseiMilestoneAchievements = ({ senseiId }: SenseiMilestoneAchievementsProps) => {
  const {
    milestones,
    progress,
    isLoading,
    getMilestoneIcon,
    getMilestoneTitle,
    getMilestoneColor
  } = useMilestoneTracker(senseiId);

  const getProgressIcon = (percentage: number) => {
    if (percentage >= 90) return Crown;
    if (percentage >= 75) return Star;
    if (percentage >= 50) return Target;
    return Trophy;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-20 w-full" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Progress */}
      {progress && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Progress to Next Level
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Progress</span>
                <Badge variant="outline">
                  {Math.round(progress.current_percentage)}%
                </Badge>
              </div>
              <Progress value={progress.current_percentage} className="h-3" />
            </div>

            {/* Milestone Indicators */}
            <div className="flex justify-between items-center text-xs">
              {[50, 75, 90, 100].map((percentage, index) => {
                const isAchieved = progress.current_percentage >= percentage;
                const isCurrent = progress.next_milestone?.percentage === percentage;
                const Icon = getProgressIcon(percentage);
                
                return (
                  <div key={percentage} className="flex flex-col items-center gap-1">
                    <div className={`p-2 rounded-full border-2 ${
                      isAchieved 
                        ? 'bg-primary border-primary text-primary-foreground' 
                        : isCurrent
                        ? 'border-primary text-primary bg-primary/10'
                        : 'border-muted-foreground/30 text-muted-foreground'
                    }`}>
                      {isAchieved ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <Icon className="h-3 w-3" />
                      )}
                    </div>
                    <span className={`text-xs ${
                      isAchieved ? 'text-primary font-medium' : 'text-muted-foreground'
                    }`}>
                      {percentage}%
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Next Milestone */}
            {progress.next_milestone && (
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="font-medium">Next Milestone:</span>
                  <span className="text-muted-foreground">
                    {progress.next_milestone.percentage}% Progress
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Achievement History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Recent Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {milestones.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No milestones achieved yet</p>
              <p className="text-xs">Complete trips and improve your rating to unlock achievements!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {milestones.slice(0, 5).map((milestone) => (
                <div 
                  key={milestone.id} 
                  className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card/50"
                >
                  <div className="text-2xl">
                    {getMilestoneIcon(milestone.milestone_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm">
                      {getMilestoneTitle(milestone.milestone_type, milestone.target_level)}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Achieved {new Date(milestone.achieved_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge 
                    variant="outline" 
                    style={{ 
                      borderColor: getMilestoneColor(milestone.milestone_type),
                      color: getMilestoneColor(milestone.milestone_type)
                    }}
                  >
                    {milestone.progress_percentage}%
                  </Badge>
                </div>
              ))}
              
              {milestones.length > 5 && (
                <div className="text-center pt-2">
                  <span className="text-xs text-muted-foreground">
                    Showing 5 of {milestones.length} achievements
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Milestone Types Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Milestone Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎯</span>
              <span>50% Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">⭐</span>
              <span>75% Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🔥</span>
              <span>90% Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">👑</span>
              <span>Level Up!</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};