import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SenseiLevelBadge } from "@/components/ui/sensei-level-badge";
import { Users, TrendingUp, Award, Search, Zap } from "lucide-react";

interface SenseiEligibility {
  id: string;
  name: string;
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

interface LevelStats {
  apprentice: number;
  journey_guide: number;
  master_sensei: number;
  eligible_for_upgrade: number;
}

export const AdminSenseiLevelOverview = () => {
  const [senseis, setSenseis] = useState<SenseiEligibility[]>([]);
  const [stats, setStats] = useState<LevelStats>({
    apprentice: 0,
    journey_guide: 0,
    master_sensei: 0,
    eligible_for_upgrade: 0
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpgrading, setIsUpgrading] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchSenseiEligibility = async () => {
    try {
      setIsLoading(true);
      
      // Get all active senseis
      const { data: senseiProfiles, error: profileError } = await supabase
        .from('sensei_profiles')
        .select('id, name, sensei_level, trips_led, rating')
        .eq('is_active', true)
        .order('name');

      if (profileError) throw profileError;

      // Check eligibility for each sensei
      const eligibilityPromises = senseiProfiles.map(async (sensei) => {
        const { data: eligibilityData, error } = await supabase
          .rpc('check_sensei_level_eligibility', { p_sensei_id: sensei.id });

        if (error) {
          console.error(`Error checking eligibility for ${sensei.name}:`, error);
          return null;
        }

        return {
          id: sensei.id,
          name: sensei.name,
          ...(eligibilityData as any)
        };
      });

      const eligibilityResults = await Promise.all(eligibilityPromises);
      const validResults = eligibilityResults.filter(Boolean) as SenseiEligibility[];
      
      setSenseis(validResults);

      // Calculate stats
      const newStats = {
        apprentice: validResults.filter(s => s.current_level === 'apprentice').length,
        journey_guide: validResults.filter(s => s.current_level === 'journey_guide').length,
        master_sensei: validResults.filter(s => s.current_level === 'master_sensei').length,
        eligible_for_upgrade: validResults.filter(s => s.can_auto_upgrade).length
      };
      setStats(newStats);

    } catch (error) {
      console.error('Error fetching sensei eligibility:', error);
      toast({
        title: "Error",
        description: "Failed to fetch sensei level data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSenseiEligibility();
  }, []);

  const upgradeSensei = async (senseiId: string, newLevel: string) => {
    setIsUpgrading(senseiId);
    try {
      const { error } = await supabase.rpc('upgrade_sensei_level', {
        p_sensei_id: senseiId,
        p_new_level: newLevel,
        p_reason: 'Manual upgrade by admin due to eligibility'
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Sensei level upgraded successfully",
      });

      // Refresh data
      await fetchSenseiEligibility();
    } catch (error) {
      console.error('Error upgrading sensei:', error);
      toast({
        title: "Error",
        description: "Failed to upgrade sensei level",
        variant: "destructive",
      });
    } finally {
      setIsUpgrading(null);
    }
  };

  const filteredSenseis = senseis.filter(sensei =>
    sensei.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Apprentice</p>
              <p className="text-2xl font-bold">{stats.apprentice}</p>
            </div>
            <Users className="h-8 w-8 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Journey Guide</p>
              <p className="text-2xl font-bold">{stats.journey_guide}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Master Sensei</p>
              <p className="text-2xl font-bold">{stats.master_sensei}</p>
            </div>
            <Award className="h-8 w-8 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Eligible for Upgrade</p>
              <p className="text-2xl font-bold text-accent">{stats.eligible_for_upgrade}</p>
            </div>
            <Zap className="h-8 w-8 text-accent" />
          </CardContent>
        </Card>
      </div>

      {/* Sensei List */}
      <Card>
        <CardHeader>
          <CardTitle>Sensei Level Management</CardTitle>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search senseis..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading sensei data...</div>
          ) : (
            <div className="space-y-4">
              {filteredSenseis.map((sensei) => (
                <div key={sensei.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium">{sensei.name}</h3>
                      <SenseiLevelBadge level={sensei.current_level as any} />
                      {sensei.can_auto_upgrade && (
                        <Badge variant="secondary" className="bg-accent/10 text-accent">
                          Eligible for Upgrade
                        </Badge>
                      )}
                    </div>
                    
                    {sensei.can_auto_upgrade && (
                      <Button
                        size="sm"
                        onClick={() => upgradeSensei(sensei.id, sensei.eligible_level)}
                        disabled={isUpgrading === sensei.id}
                      >
                        {isUpgrading === sensei.id ? "Upgrading..." : `Upgrade to ${sensei.eligible_level}`}
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Current Stats</p>
                      <p className="text-sm">Trips: {sensei.current_trips} | Rating: {sensei.current_rating.toFixed(1)}</p>
                    </div>

                    {sensei.next_level && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Progress to {sensei.next_level.display_name}
                        </p>
                        
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>Trips</span>
                            <span>{sensei.next_level.trips_progress.current}/{sensei.next_level.trips_progress.required}</span>
                          </div>
                          <Progress value={sensei.next_level.trips_progress.percentage} className="h-2" />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>Rating</span>
                            <span>{sensei.next_level.rating_progress.current.toFixed(1)}/{sensei.next_level.rating_progress.required.toFixed(1)}</span>
                          </div>
                          <Progress value={sensei.next_level.rating_progress.percentage} className="h-2" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {filteredSenseis.length === 0 && !isLoading && (
                <div className="text-center py-8 text-muted-foreground">
                  No senseis found matching your search.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};