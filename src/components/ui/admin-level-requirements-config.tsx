import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useLevelRequirements } from "@/hooks/use-level-requirements";
import { useState } from "react";
import { Settings, Save, RefreshCw, Play, TestTube } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const AdminLevelRequirementsConfig = () => {
  const {
    requirements,
    isLoading,
    updateRequirement,
    triggerManualUpgrade,
    testAutoUpgradeFunction
  } = useLevelRequirements();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>({});
  const [isTesting, setIsTesting] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);

  const handleEdit = (requirement: any) => {
    setEditingId(requirement.id);
    setEditValues({
      trips_required: requirement.trips_required,
      rating_required: requirement.rating_required,
      is_active: requirement.is_active
    });
  };

  const handleSave = async () => {
    if (!editingId) return;

    const success = await updateRequirement({
      id: editingId,
      ...editValues
    });

    if (success) {
      setEditingId(null);
      setEditValues({});
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValues({});
  };

  const handleManualUpgrade = async () => {
    setIsUpgrading(true);
    await triggerManualUpgrade();
    setIsUpgrading(false);
  };

  const handleTestFunction = async () => {
    setIsTesting(true);
    await testAutoUpgradeFunction();
    setIsTesting(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Level Requirements Configuration
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure the requirements for each sensei level. Changes apply to future auto-upgrades.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {requirements.map((requirement) => (
            <div key={requirement.id} className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium capitalize">
                    {requirement.level_name.replace('_', ' ')}
                  </h3>
                  <Badge 
                    variant={requirement.is_active ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {requirement.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {editingId === requirement.id ? (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSave}>
                      <Save className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCancel}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => handleEdit(requirement)}>
                    Edit
                  </Button>
                )}
              </div>

              {editingId === requirement.id ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`trips-${requirement.id}`}>Trips Required</Label>
                    <Input
                      id={`trips-${requirement.id}`}
                      type="number"
                      value={editValues.trips_required}
                      onChange={(e) => setEditValues(prev => ({
                        ...prev,
                        trips_required: parseInt(e.target.value) || 0
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`rating-${requirement.id}`}>Rating Required</Label>
                    <Input
                      id={`rating-${requirement.id}`}
                      type="number"
                      step="0.1"
                      min="0"
                      max="5"
                      value={editValues.rating_required}
                      onChange={(e) => setEditValues(prev => ({
                        ...prev,
                        rating_required: parseFloat(e.target.value) || 0
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`active-${requirement.id}`}>Active</Label>
                    <div className="flex items-center pt-2">
                      <Switch
                        id={`active-${requirement.id}`}
                        checked={editValues.is_active}
                        onCheckedChange={(checked) => setEditValues(prev => ({
                          ...prev,
                          is_active: checked
                        }))}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Trips Required:</span>
                    <div className="font-medium">{requirement.trips_required}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Rating Required:</span>
                    <div className="font-medium">{requirement.rating_required.toFixed(1)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <div className="font-medium">
                      {requirement.is_active ? "Active" : "Inactive"}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Manual Operations Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Manual Operations
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Test and trigger upgrade operations manually.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={handleManualUpgrade}
              disabled={isUpgrading}
              className="flex items-center gap-2"
            >
              {isUpgrading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isUpgrading ? "Upgrading..." : "Run Manual Upgrade"}
            </Button>

            <Button 
              variant="outline"
              onClick={handleTestFunction}
              disabled={isTesting}
              className="flex items-center gap-2"
            >
              {isTesting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <TestTube className="h-4 w-4" />
              )}
              {isTesting ? "Testing..." : "Test Auto-Upgrade Function"}
            </Button>
          </div>

          <Separator />

          <div className="text-xs text-muted-foreground space-y-1">
            <p>• <strong>Manual Upgrade:</strong> Immediately checks all senseis for level upgrades</p>
            <p>• <strong>Test Function:</strong> Tests the scheduled auto-upgrade edge function</p>
            <p>• <strong>Scheduled Run:</strong> Automatic upgrades run daily at 2:00 AM</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};