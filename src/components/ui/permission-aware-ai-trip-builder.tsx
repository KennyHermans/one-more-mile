import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AITripBuilder } from "@/components/ui/ai-trip-builder";
import { SenseiLevelBadge } from "@/components/ui/sensei-level-badge";
import { useSenseiPermissions } from "@/hooks/use-sensei-permissions";
import { useSenseiGamification } from "@/hooks/use-sensei-gamification";
import { Crown, Lock, Star } from "lucide-react";

interface PermissionAwareAiTripBuilderProps {
  senseiId: string;
  onSuccess?: () => void;
}

export const PermissionAwareAiTripBuilder = ({ 
  senseiId, 
  onSuccess 
}: PermissionAwareAiTripBuilderProps) => {
  const { permissions, isLoading: permissionsLoading } = useSenseiPermissions(senseiId);
  const { level, getProgressToNextLevel } = useSenseiGamification(senseiId);

  if (permissionsLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">Loading AI Trip Builder...</div>
        </CardContent>
      </Card>
    );
  }

  const canUseAiBuilder = permissions?.can_use_ai_builder || false;
  const currentLevel = level?.eligible_level || 'apprentice';
  const progress = getProgressToNextLevel();

  if (!canUseAiBuilder) {
    return (
      <Card className="border-warning">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-warning" />
              AI Trip Builder Locked
            </CardTitle>
            <SenseiLevelBadge level={currentLevel} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-6">
            <Crown className="h-12 w-12 text-warning mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Master Sensei Level Required
            </h3>
            <p className="text-muted-foreground mb-4">
              The AI Trip Builder is available to Master Sensei level users only. 
              Complete more trips and maintain a high rating to unlock this feature.
            </p>

            {currentLevel === 'journey_guide' && progress && (
              <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                <h4 className="font-medium">Almost there! Requirements for Master Sensei:</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {progress.trips.current}/{progress.trips.required}
                    </div>
                    <div className="text-muted-foreground">Trips Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {progress.rating.current.toFixed(1)}/{progress.rating.required.toFixed(1)}
                    </div>
                    <div className="text-muted-foreground">Average Rating</div>
                  </div>
                </div>
              </div>
            )}

            {currentLevel === 'apprentice' && (
              <div className="bg-muted/30 rounded-lg p-4">
                <h4 className="font-medium mb-2">Your Journey to AI Trip Builder:</h4>
                <div className="space-y-2 text-sm text-left">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Step 1</Badge>
                    <span>Complete your first trip → Journey Guide level</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Step 2</Badge>
                    <span>Complete 3 trips with 4.5+ rating → Master Sensei level</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Step 3</Badge>
                    <span>Unlock AI Trip Builder + Full Platform Access</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-center">
            <Button variant="outline" disabled>
              <Crown className="h-4 w-4 mr-2" />
              Master Sensei Level Required
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Success badge for Master Sensei */}
      <Card className="border-success bg-success/5">
        <CardContent className="py-4">
          <div className="flex items-center justify-center gap-3">
            <Crown className="h-6 w-6 text-success" />
            <span className="font-medium text-success">
              AI Trip Builder Unlocked - Master Sensei Level
            </span>
            <SenseiLevelBadge level="master_sensei" />
          </div>
        </CardContent>
      </Card>

      {/* AI Trip Builder Component */}
      <AITripBuilder
        onTripGenerated={onSuccess}
      />
    </div>
  );
};