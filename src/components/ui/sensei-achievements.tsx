import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Crown, Calendar, Award } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Achievement {
  id: string;
  achievement_type: string;
  achievement_name: string;
  achievement_description: string;
  unlocked_at: string;
  metadata: any;
}

interface SenseiAchievementsProps {
  achievements: Achievement[];
  isLoading?: boolean;
}

export const SenseiAchievements = ({ achievements, isLoading }: SenseiAchievementsProps) => {
  const getAchievementIcon = (type: string) => {
    switch (type) {
      case 'level_progression':
        return Crown;
      case 'trip_completion':
        return Star;
      case 'rating_milestone':
        return Trophy;
      case 'first_trip':
        return Award;
      default:
        return Trophy;
    }
  };

  const getAchievementColor = (type: string) => {
    switch (type) {
      case 'level_progression':
        return 'hsl(var(--accent))';
      case 'trip_completion':
        return 'hsl(var(--primary))';
      case 'rating_milestone':
        return 'hsl(var(--warning))';
      case 'first_trip':
        return 'hsl(var(--success))';
      default:
        return 'hsl(var(--muted-foreground))';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-10 w-10 bg-muted rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted rounded w-3/4 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (achievements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Complete your first trip to unlock achievements!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Achievements
          <Badge variant="secondary">{achievements.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {achievements.map((achievement) => {
            const Icon = getAchievementIcon(achievement.achievement_type);
            const color = getAchievementColor(achievement.achievement_type);
            
            return (
              <div
                key={achievement.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
              >
                <div 
                  className="p-2 rounded-full"
                  style={{ backgroundColor: `${color}20` }}
                >
                  <Icon 
                    className="h-5 w-5" 
                    style={{ color }}
                  />
                </div>
                
                <div className="flex-1 space-y-1">
                  <div className="flex items-start justify-between">
                    <h4 className="font-medium text-sm">
                      {achievement.achievement_name}
                    </h4>
                    <Badge variant="outline" className="text-xs">
                      {achievement.achievement_type.replace('_', ' ')}
                    </Badge>
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    {achievement.achievement_description}
                  </p>
                  
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      Unlocked {formatDistanceToNow(new Date(achievement.unlocked_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};