import React, { useEffect, useState } from 'react';
import { useSenseiLevel } from '@/contexts/SenseiLevelContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SenseiLevelBadge } from '@/components/ui/sensei-level-badge';
import { Crown, Sparkles, X } from 'lucide-react';

export const SenseiLevelChangeNotification: React.FC = () => {
  const { currentLevel, lastLevelChange, isLevelChanging } = useSenseiLevel();
  const [showNotification, setShowNotification] = useState(false);
  const [previousLevel, setPreviousLevel] = useState<string | null>(null);

  useEffect(() => {
    if (lastLevelChange && currentLevel && !isLevelChanging) {
      // Show notification for 10 seconds after level change
      const timeSinceChange = Date.now() - lastLevelChange.getTime();
      if (timeSinceChange < 10000) {
        setShowNotification(true);
        
        // Auto-hide after 8 seconds
        setTimeout(() => {
          setShowNotification(false);
        }, 8000);
      }
    }
  }, [lastLevelChange, currentLevel, isLevelChanging]);

  if (!showNotification || !currentLevel) return null;

  const getLevelDisplayName = (level: string) => {
    switch (level) {
      case 'apprentice': return 'Apprentice Sensei';
      case 'journey_guide': return 'Journey Guide';
      case 'master_sensei': return 'Master Sensei';
      default: return level;
    }
  };

  const getUpgradeMessage = (level: string) => {
    switch (level) {
      case 'journey_guide':
        return {
          title: "Congratulations! You've become a Journey Guide!",
          benefits: ["Create your own trips", "Access advanced analytics", "Enhanced profile visibility"],
          icon: Crown
        };
      case 'master_sensei':
        return {
          title: "Amazing! You've achieved Master Sensei status!",
          benefits: ["Use AI Trip Builder", "Modify pricing", "Premium support", "Exclusive opportunities"],
          icon: Sparkles
        };
      default:
        return {
          title: `Welcome to ${getLevelDisplayName(level)}!`,
          benefits: ["Your journey begins here"],
          icon: Crown
        };
    }
  };

  const upgrade = getUpgradeMessage(currentLevel);
  const Icon = upgrade.icon;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md animate-in slide-in-from-top-4 duration-500">
        <Card className="border-2 border-primary shadow-2xl bg-gradient-to-r from-primary/10 to-accent/10 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/20">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">
                    Level Up!
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {upgrade.title}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotification(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="flex justify-center">
                <SenseiLevelBadge 
                  level={currentLevel as any} 
                  size="lg" 
                  className="animate-pulse"
                />
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-2">New Abilities Unlocked:</h4>
                <ul className="text-sm space-y-1">
                  {upgrade.benefits.map((benefit, index) => (
                    <li
                      key={index}
                      className="flex items-center gap-2 text-muted-foreground animate-in slide-in-from-left duration-300"
                      style={{ animationDelay: `${index * 100 + 300}ms` }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="text-xs text-center text-muted-foreground pt-2 border-t">
                Your dashboard has been updated with new permissions
              </div>
            </div>
          </CardContent>
        </Card>
    </div>
  );
};