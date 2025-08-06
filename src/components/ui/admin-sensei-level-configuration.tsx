import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Settings, Save, Play, RefreshCw } from "lucide-react";

interface LevelRequirement {
  id: string;
  level_name: string;
  display_name: string;
  level_order: number;
  trips_required: number;
  rating_required: number;
  is_active: boolean;
}

export const AdminSenseiLevelConfiguration = () => {
  const [requirements, setRequirements] = useState<LevelRequirement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunningAutoUpgrade, setIsRunningAutoUpgrade] = useState(false);
  const { toast } = useToast();

  const fetchRequirements = async () => {
    try {
      const { data, error } = await supabase
        .from('sensei_level_requirements')
        .select('*')
        .order('level_order');

      if (error) throw error;
      setRequirements(data || []);
    } catch (error) {
      console.error('Error fetching level requirements:', error);
      toast({
        title: "Error",
        description: "Failed to fetch level requirements",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequirements();
  }, []);

  const updateRequirement = (id: string, field: string, value: any) => {
    setRequirements(prev => 
      prev.map(req => 
        req.id === id ? { ...req, [field]: value } : req
      )
    );
  };

  const saveRequirements = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('sensei_level_requirements')
        .upsert(
          requirements.map(req => ({
            id: req.id,
            level_name: req.level_name,
            display_name: req.display_name,
            level_order: req.level_order,
            trips_required: req.trips_required,
            rating_required: req.rating_required,
            is_active: req.is_active,
            updated_at: new Date().toISOString()
          }))
        );

      if (error) throw error;

      toast({
        title: "Success",
        description: "Level requirements updated successfully",
      });
    } catch (error) {
      console.error('Error saving requirements:', error);
      toast({
        title: "Error",
        description: "Failed to save level requirements",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const runAutoUpgrade = async () => {
    setIsRunningAutoUpgrade(true);
    try {
      const { data, error } = await supabase.rpc('enhanced_auto_upgrade_sensei_levels');

      if (error) throw error;

      const result = data as { upgrades_performed: number; success: boolean };
      
      toast({
        title: "Auto-upgrade Complete",
        description: `${result?.upgrades_performed || 0} senseis were automatically upgraded`,
      });
    } catch (error) {
      console.error('Error running auto-upgrade:', error);
      toast({
        title: "Error",
        description: "Failed to run auto-upgrade process",
        variant: "destructive",
      });
    } finally {
      setIsRunningAutoUpgrade(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Sensei Level Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Sensei Level Configuration
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure automatic level progression criteria for senseis
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button 
            onClick={saveRequirements}
            disabled={isSaving}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
          <Button 
            onClick={runAutoUpgrade}
            disabled={isRunningAutoUpgrade}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            {isRunningAutoUpgrade ? "Running..." : "Run Auto-Upgrade"}
          </Button>
        </div>

        {/* Level Requirements */}
        <div className="space-y-4">
          {requirements.map((requirement) => (
            <div key={requirement.id} className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="font-medium">{requirement.display_name}</h3>
                  <Badge variant={requirement.is_active ? "default" : "secondary"}>
                    {requirement.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <Switch
                  checked={requirement.is_active}
                  onCheckedChange={(checked) => 
                    updateRequirement(requirement.id, 'is_active', checked)
                  }
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`display-${requirement.id}`}>Display Name</Label>
                  <Input
                    id={`display-${requirement.id}`}
                    value={requirement.display_name}
                    onChange={(e) => 
                      updateRequirement(requirement.id, 'display_name', e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`trips-${requirement.id}`}>Trips Required</Label>
                  <Input
                    id={`trips-${requirement.id}`}
                    type="number"
                    min="0"
                    value={requirement.trips_required}
                    onChange={(e) => 
                      updateRequirement(requirement.id, 'trips_required', parseInt(e.target.value) || 0)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`rating-${requirement.id}`}>Minimum Rating</Label>
                  <Input
                    id={`rating-${requirement.id}`}
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={requirement.rating_required}
                    onChange={(e) => 
                      updateRequirement(requirement.id, 'rating_required', parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <h4 className="font-medium">How it Works</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Senseis automatically progress when they meet the criteria for a higher level</li>
            <li>• Auto-upgrade runs when sensei stats change (trips completed, ratings received)</li>
            <li>• Manual upgrades by admins are still possible and override automatic progression</li>
            <li>• All level changes are logged in the sensei level history</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};