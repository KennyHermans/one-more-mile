
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SenseiLevelBadge } from "@/components/ui/sensei-level-badge";
import { AdminSenseiLevelManagement } from "@/components/ui/admin-sensei-level-management";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Users, TrendingUp, Shield, RefreshCw } from "lucide-react";

interface LevelStats {
  level_name: string;
  count: number;
  percentage: number;
}

interface SenseiOverview {
  id: string;
  name: string;
  sensei_level: 'apprentice' | 'journey_guide' | 'master_sensei';
  trips_led: number;
  rating: number;
  eligible_for_upgrade: boolean;
  next_eligible_level?: string;
}

interface EligibilityResponse {
  can_auto_upgrade: boolean;
  eligible_level: string;
  requirements_met: Record<string, boolean>;
}

export const AdminSenseiLevelOverview = () => {
  const [levelStats, setLevelStats] = useState<LevelStats[]>([]);
  const [senseiOverview, setSenseiOverview] = useState<SenseiOverview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchLevelStats = async () => {
    try {
      setError(null);
      const { data, error: statsError } = await supabase
        .from('sensei_profiles')
        .select('sensei_level')
        .eq('is_active', true);

      if (statsError) {
        console.error('Stats error:', statsError);
        setError('Failed to load level statistics');
        return;
      }

      const stats = (data || []).reduce((acc: Record<string, number>, sensei) => {
        acc[sensei.sensei_level] = (acc[sensei.sensei_level] || 0) + 1;
        return acc;
      }, {});

      const total = Object.values(stats).reduce((sum, count) => sum + count, 0);
      const formattedStats = Object.entries(stats).map(([level, count]) => ({
        level_name: level,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0
      }));

      setLevelStats(formattedStats);
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred');
    }
  };

  const fetchSenseiOverview = async () => {
    try {
      setError(null);
      const { data, error: overviewError } = await supabase
        .from('sensei_profiles')
        .select('id, name, sensei_level, trips_led, rating')
        .eq('is_active', true)
        .order('trips_led', { ascending: false });

      if (overviewError) {
        console.error('Overview error:', overviewError);
        setError('Failed to load sensei overview');
        return;
      }

      if (data && Array.isArray(data)) {
        // Check eligibility for each sensei
        const senseiWithEligibility = await Promise.all(
          data.map(async (sensei) => {
            try {
              const eligibilityResponse = await supabase.rpc('check_sensei_level_eligibility', {
                p_sensei_id: sensei.id
              });
              
              // Safely access the response data with type casting
              const eligibility = eligibilityResponse.data as EligibilityResponse | null;
              const canUpgrade = eligibility?.can_auto_upgrade || false;
              const eligibleLevel = eligibility?.eligible_level;
              
              return {
                ...sensei,
                sensei_level: sensei.sensei_level as 'apprentice' | 'journey_guide' | 'master_sensei',
                eligible_for_upgrade: canUpgrade,
                next_eligible_level: canUpgrade ? eligibleLevel : undefined
              } as SenseiOverview;
            } catch (err) {
              console.error('Error checking eligibility for sensei:', sensei.id, err);
              return {
                ...sensei,
                sensei_level: sensei.sensei_level as 'apprentice' | 'journey_guide' | 'master_sensei',
                eligible_for_upgrade: false,
                next_eligible_level: undefined
              } as SenseiOverview;
            }
          })
        );

        setSenseiOverview(senseiWithEligibility);
      } else {
        setSenseiOverview([]);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred');
      setSenseiOverview([]);
    }
  };

  const autoUpgradeEligibleSenseis = async () => {
    try {
      const { data, error: upgradeError } = await supabase
        .rpc('auto_upgrade_sensei_levels');

      if (upgradeError) {
        console.error('Auto-upgrade error:', upgradeError);
        toast({
          title: "Error",
          description: "Failed to run auto-upgrade process",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Auto-upgrade Complete",
        description: `${data || 0} senseis were automatically upgraded`,
      });

      // Refresh data
      await fetchData();
    } catch (err) {
      console.error('Unexpected error:', err);
      toast({
        title: "Error",
        description: "An unexpected error occurred during auto-upgrade",
        variant: "destructive",
      });
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    await Promise.all([fetchLevelStats(), fetchSenseiOverview()]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={() => fetchData()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const eligibleCount = senseiOverview.filter(s => s.eligible_for_upgrade).length;

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Active Senseis</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? <RefreshCw className="h-6 w-6 animate-spin" /> : levelStats.reduce((sum, stat) => sum + stat.count, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eligible for Upgrade</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? <RefreshCw className="h-6 w-6 animate-spin" /> : eligibleCount}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Master Senseis</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <RefreshCw className="h-6 w-6 animate-spin" />
              ) : (
                levelStats.find(s => s.level_name === 'master_sensei')?.count || 0
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Level Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Level Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-4">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {levelStats.map((stat) => (
                <div key={stat.level_name} className="flex items-center justify-between">
                  <SenseiLevelBadge level={stat.level_name as any} />
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{stat.count}</span>
                    <Badge variant="outline">{stat.percentage}%</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={autoUpgradeEligibleSenseis}
            disabled={isLoading || eligibleCount === 0}
            className="w-full"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Auto-Upgrade Eligible Senseis ({eligibleCount})
          </Button>
        </CardContent>
      </Card>

      {/* Manual Level Management */}
      <AdminSenseiLevelManagement />
    </div>
  );
};
