import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SenseiLevelBadge } from "@/components/ui/sensei-level-badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { handleError } from "@/lib/error-handler";
import { Crown, Settings, History, AlertTriangle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface Sensei {
  id: string;
  name: string;
  sensei_level: 'apprentice' | 'journey_guide' | 'master_sensei';
  trips_led: number;
  rating: number;
  level_achieved_at: string;
  user_id: string;
}

interface LevelHistory {
  id: string;
  previous_level: string;
  new_level: string;
  changed_by: string;
  change_reason: string;
  created_at: string;
}

export const AdminSenseiLevelManagement = () => {
  const [senseis, setSenseis] = useState<Sensei[]>([]);
  const [selectedSensei, setSelectedSensei] = useState<Sensei | null>(null);
  const [levelHistory, setLevelHistory] = useState<LevelHistory[]>([]);
  const [newLevel, setNewLevel] = useState<'apprentice' | 'journey_guide' | 'master_sensei'>('apprentice');
  const [reason, setReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [adminOverride, setAdminOverride] = useState(false);
  const { toast } = useToast();

  const fetchSenseis = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('sensei_profiles')
        .select('id, name, sensei_level, trips_led, rating, level_achieved_at, user_id')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setSenseis(data || []);
    } catch (error) {
      handleError(error, {
        component: 'AdminSenseiLevelManagement',
        action: 'fetchSenseis'
      }, true, "Failed to load sensei data");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLevelHistory = async (senseiId: string) => {
    try {
      const { data, error } = await supabase
        .from('sensei_level_history')
        .select('*')
        .eq('sensei_id', senseiId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLevelHistory(data || []);
    } catch (error) {
      handleError(error, {
        component: 'AdminSenseiLevelManagement',
        action: 'fetchLevelHistory',
        userId: senseiId
      }, true, "Failed to load level history");
    }
  };

  const updateSenseiLevel = async () => {
    if (!selectedSensei || !reason.trim()) {
      toast({
        title: "Error",
        description: "Please select a sensei and provide a reason",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsUpdating(true);
      
      const { data, error } = await supabase
        .rpc('upgrade_sensei_level', {
          p_sensei_id: selectedSensei.id,
          p_new_level: newLevel,
          p_changed_by: null, // Will be determined by the function
          p_reason: reason,
          p_admin_override: adminOverride
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Sensei level updated to ${newLevel.replace('_', ' ')}`,
      });

      // Refresh data
      await fetchSenseis();
      await fetchLevelHistory(selectedSensei.id);
      setReason('');
      setAdminOverride(false);
    } catch (error) {
      handleError(error, {
        component: 'AdminSenseiLevelManagement',
        action: 'updateLevel',
        userId: selectedSensei?.user_id
      }, true, "Failed to update sensei level");
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredSenseis = senseis.filter(sensei =>
    sensei.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    fetchSenseis();
  }, []);

  useEffect(() => {
    if (selectedSensei) {
      setNewLevel(selectedSensei.sensei_level);
      fetchLevelHistory(selectedSensei.id);
    }
  }, [selectedSensei]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5" />
          Sensei Level Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search */}
        <div>
          <Label htmlFor="search">Search Senseis</Label>
          <Input
            id="search"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Senseis Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Current Level</TableHead>
                <TableHead>Trips Led</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Level Since</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading senseis...
                  </TableCell>
                </TableRow>
              ) : filteredSenseis.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No senseis found
                  </TableCell>
                </TableRow>
              ) : (
                filteredSenseis.map((sensei) => (
                  <TableRow key={sensei.id}>
                    <TableCell className="font-medium">{sensei.name}</TableCell>
                    <TableCell>
                      <SenseiLevelBadge level={sensei.sensei_level} />
                    </TableCell>
                    <TableCell>{sensei.trips_led}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {sensei.rating.toFixed(1)}⭐
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(sensei.level_achieved_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedSensei(sensei)}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>
                                Manage Level: {selectedSensei?.name}
                              </DialogTitle>
                            </DialogHeader>
                            
                            {selectedSensei && (
                              <div className="space-y-6">
                                {/* Current Status */}
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>Current Level</Label>
                                    <div className="mt-1">
                                      <SenseiLevelBadge level={selectedSensei.sensei_level} />
                                    </div>
                                  </div>
                                  <div>
                                    <Label>Performance</Label>
                                    <div className="text-sm text-muted-foreground mt-1">
                                      {selectedSensei.trips_led} trips • {selectedSensei.rating.toFixed(1)}⭐ rating
                                    </div>
                                  </div>
                                </div>

                                {/* Level Change Form */}
                                <div className="space-y-4">
                                  <div>
                                    <Label htmlFor="newLevel">New Level</Label>
                                    <Select value={newLevel} onValueChange={(value) => setNewLevel(value as 'apprentice' | 'journey_guide' | 'master_sensei')}>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="apprentice">Apprentice Sensei</SelectItem>
                                        <SelectItem value="journey_guide">Journey Guide</SelectItem>
                                        <SelectItem value="master_sensei">Master Sensei</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div>
                                    <Label htmlFor="reason">Reason for Change</Label>
                                    <Textarea
                                      id="reason"
                                      placeholder="Explain why you're changing this sensei's level..."
                                      value={reason}
                                      onChange={(e) => setReason(e.target.value)}
                                      rows={3}
                                    />
                                  </div>

                                  <div className="flex items-center space-x-2 p-4 border border-orange-200 rounded-lg bg-orange-50">
                                    <Checkbox
                                      id="adminOverride"
                                      checked={adminOverride}
                                      onCheckedChange={(checked) => setAdminOverride(checked as boolean)}
                                    />
                                    <div className="flex items-center gap-2">
                                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                                      <Label htmlFor="adminOverride" className="text-sm font-medium">
                                        Admin Override (bypass level requirements)
                                      </Label>
                                    </div>
                                  </div>

                                  <Button
                                    onClick={updateSenseiLevel}
                                    disabled={isUpdating || !reason.trim() || newLevel === selectedSensei.sensei_level}
                                    className="w-full"
                                  >
                                    {isUpdating ? 'Updating...' : 'Update Level'}
                                  </Button>
                                </div>

                                {/* Level History */}
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <History className="h-4 w-4" />
                                    <Label>Level History</Label>
                                  </div>
                                  <div className="border rounded-lg max-h-40 overflow-y-auto">
                                    {levelHistory.length === 0 ? (
                                      <div className="p-4 text-center text-muted-foreground">
                                        No level changes recorded
                                      </div>
                                    ) : (
                                      <div className="divide-y">
                                        {levelHistory.map((history) => (
                                          <div key={history.id} className="p-3 space-y-1">
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-2">
                                                {history.previous_level && (
                                                  <SenseiLevelBadge 
                                                    level={history.previous_level as any} 
                                                    size="sm" 
                                                  />
                                                )}
                                                <span className="text-sm">→</span>
                                                <SenseiLevelBadge 
                                                  level={history.new_level as any} 
                                                  size="sm" 
                                                />
                                              </div>
                                              <span className="text-xs text-muted-foreground">
                                                {new Date(history.created_at).toLocaleDateString()}
                                              </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                              {history.change_reason}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};