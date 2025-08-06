import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SenseiLevelBadge } from "@/components/ui/sensei-level-badge";
import { SenseiLevelProgress } from "@/components/ui/sensei-level-progress";
import { SenseiAchievements } from "@/components/ui/sensei-achievements";
import { SenseiMilestoneAchievements } from "@/components/ui/sensei-milestone-achievements";
import { useSenseiGamification } from "@/hooks/use-sensei-gamification";
import { useMilestoneTracker } from "@/hooks/use-milestone-tracker";
import { Skeleton } from "@/components/ui/skeleton";

interface SenseiGamificationDashboardProps {
  senseiId: string;
}

export const SenseiGamificationDashboard = ({ senseiId }: SenseiGamificationDashboardProps) => {
  const {
    level,
    permissions,
    achievements,
    isLoading,
    getLevelDisplayName,
    getProgressToNextLevel
  } = useSenseiGamification(senseiId);

  const { milestones, checkAndAwardMilestones } = useMilestoneTracker(senseiId);

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!level) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            Unable to load gamification data.
          </p>
        </CardContent>
      </Card>
    );
  }

  const progress = getProgressToNextLevel();
  const currentLevel = level.eligible_level;
  
  const getNextLevel = (): 'journey_guide' | 'master_sensei' | undefined => {
    if (currentLevel === 'apprentice') return 'journey_guide';
    if (currentLevel === 'journey_guide') return 'master_sensei';
    return undefined;
  };

  const nextLevel = getNextLevel();
  const isMaxLevel = currentLevel === 'master_sensei';

  return (
    <div className="space-y-6">
      {/* Current Level Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Your Sensei Level</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <SenseiLevelBadge level={currentLevel} size="lg" />
              <p className="text-sm text-muted-foreground mt-2">
                {getLevelDisplayName(currentLevel)}
              </p>
            </div>
            {permissions && (
              <div className="text-right">
                <p className="text-sm font-medium">Permissions Unlocked</p>
                <div className="flex flex-wrap gap-1 mt-1 justify-end">
                  {permissions.can_edit_trips && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                      Edit Trips
                    </span>
                  )}
                  {permissions.can_create_trips && (
                    <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded">
                      Create Trips
                    </span>
                  )}
                  {permissions.can_use_ai_builder && (
                    <span className="text-xs bg-success/10 text-success px-2 py-1 rounded">
                      AI Builder
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Level Progress */}
        <SenseiLevelProgress senseiId={senseiId} />

        {/* Milestone Achievements */}
        <SenseiMilestoneAchievements senseiId={senseiId} />

        {/* Traditional Achievements */}
        <SenseiAchievements
          achievements={achievements}
          isLoading={isLoading}
        />
      </div>

      {/* Permissions Detail */}
      {permissions && (
        <Card>
          <CardHeader>
            <CardTitle>Your Current Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-medium mb-2">Trip Management</h4>
                <ul className="space-y-1 text-sm">
                  <li className={permissions.can_view_trips ? 'text-success' : 'text-muted-foreground'}>
                    {permissions.can_view_trips ? '✓' : '✗'} View trips
                  </li>
                  <li className={permissions.can_edit_trips ? 'text-success' : 'text-muted-foreground'}>
                    {permissions.can_edit_trips ? '✓' : '✗'} Edit assigned trips
                  </li>
                  <li className={permissions.can_create_trips ? 'text-success' : 'text-muted-foreground'}>
                    {permissions.can_create_trips ? '✓' : '✗'} Create new trips
                  </li>
                  <li className={permissions.can_publish_trips ? 'text-success' : 'text-muted-foreground'}>
                    {permissions.can_publish_trips ? '✓' : '✗'} Publish trips
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Advanced Features</h4>
                <ul className="space-y-1 text-sm">
                  <li className={permissions.can_use_ai_builder ? 'text-success' : 'text-muted-foreground'}>
                    {permissions.can_use_ai_builder ? '✓' : '✗'} AI trip builder
                  </li>
                  <li className={permissions.can_modify_pricing ? 'text-success' : 'text-muted-foreground'}>
                    {permissions.can_modify_pricing ? '✓' : '✗'} Modify pricing
                  </li>
                  <li className={permissions.can_apply_backup ? 'text-success' : 'text-muted-foreground'}>
                    {permissions.can_apply_backup ? '✓' : '✗'} Apply as backup sensei
                  </li>
                  <li className={permissions.can_edit_profile ? 'text-success' : 'text-muted-foreground'}>
                    {permissions.can_edit_profile ? '✓' : '✗'} Edit profile
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};