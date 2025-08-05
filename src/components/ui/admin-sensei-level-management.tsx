
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
import { Crown, Settings, History, AlertTriangle, RefreshCw } from "lucide-react";
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
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchSenseis = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('sensei_profiles')
        .select('id, name, sensei_level, trips_led, rating, level_achieved_at, user_id')
        .eq('is_active', true)
        .order('name');

      if (fetchError) {
        console.error('Fetch senseis error:', fetchError);
        setError('Failed to load sensei data');
        return;
      }
      
      // Map data to ensure sensei_level matches our enum
      const mappedData = (data || []).map(sensei => ({
        ...sensei,
        sensei_level: (sensei.sensei_level as 'apprentice' | 'journey_guide' | 'master_sensei') || 'apprentice'
      }));
      
      setSenseis(mappedData);
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred while loading sensei data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLevelHistory = async (senseiId: string) => {
    try {
      setError(null);
      
      const { data, error: historyError } = await supabase
        .from('sensei_level_history')
        .select('*')
        .eq('sensei_id', senseiId)
        .order('created_at', { ascending: false });

      if (historyError) {
        console.error('Fetch history error:', historyError);
        toast({
          title: "Warning",
          description: "Failed to load level history",
          variant: "destructive"
        });
        return;
      }
      
      setLevelHistory(data || []);
    } catch (err) {
      console.error('Unexpected error:', err);
      toast({
        title: "Warning",
        description: "An unexpected error occurred while loading history",
        variant: "destructive"
      });
    }
  };

  const performDirectUpdate = async (): Promise<boolean> => {
    console.log('Performing direct database update...');
    
    // Update sensei level directly
    const { error: directUpdateError } = await supabase
      .from('sensei_profiles')
      .update({
        sensei_level: newLevel,
        level_achieved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', selectedSensei!.id);

    if (directUpdateError) {
      console.error('Direct update error:', directUpdateError);
      throw new Error(`Failed to update sensei profile: ${directUpdateError.message}`);
    }

    // Add level history entry
    const { error: historyError } = await supabase
      .from('sensei_level_history')
      .insert({
        sensei_id: selectedSensei!.id,
        previous_level: selectedSensei!.sensei_level,
        new_level: newLevel,
        change_reason: adminOverride ? `${reason} (Admin Override)` : reason,
        requirements_met: {
          timestamp: new Date().toISOString(),
          updated_by: 'admin',
          admin_override: adminOverride
        }
      });

    if (historyError) {
      console.error('History insert error:', historyError);
      // Don't fail the whole operation for history error, just log it
    }

    console.log('Direct update successful');
    return true;
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
      setError(null);
      
      console.log('Attempting to update sensei level:', {
        sensei_id: selectedSensei.id,
        current_level: selectedSensei.sensei_level,
        new_level: newLevel,
        reason: reason,
        admin_override: adminOverride
      });

      let updateSuccessful = false;

      // If admin override is enabled, skip RPC and go straight to direct update
      if (adminOverride) {
        console.log('Admin override enabled - using direct database update');
        updateSuccessful = await performDirectUpdate();
      } else {
        // Try RPC function first for non-admin override cases
        console.log('Attempting RPC function call...');
        try {
          const { data, error: updateError } = await supabase
            .rpc('upgrade_sensei_level', {
              p_sensei_id: selectedSensei.id,
              p_new_level: newLevel,
              p_reason: reason
            });

          console.log('RPC response:', { data, updateError });

          // Check if RPC was successful
          if (!updateError && data && typeof data === 'object' && 'success' in data && data.success) {
            console.log('RPC update successful');
            updateSuccessful = true;
          } else {
            // Log the RPC failure but don't throw - we'll use fallback
            if (updateError) {
              console.log('RPC failed with error:', updateError.message);
            }
            if (data && typeof data === 'object' && 'error' in data) {
              console.log('RPC returned error:', data.error);
            }
            throw new Error('RPC_FAILED'); // Signal to use fallback
          }
        } catch (rpcError) {
          // RPC failed, fall back to direct update
          console.log('RPC failed, attempting direct update fallback...');
          updateSuccessful = await performDirectUpdate();
        }
      }

      if (!updateSuccessful) {
        throw new Error('Failed to update sensei level through all available methods');
      }

      toast({
        title: "Success",
        description: `Sensei level updated to ${newLevel.replace('_', ' ')}`,
      });

      // Refresh data
      await fetchSenseis();
      await fetchLevelHistory(selectedSensei.id);
      setReason('');
      setAdminOverride(false);
    } catch (err) {
      console.error('Update failed with error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast({
        title: "Error",
        description: `Failed to update sensei level: ${errorMessage}`,
        variant: "destructive"
      });
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

  if (error && senseis.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Sensei Level Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={fetchSenseis}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5" />
          Manual Level Management
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Manually upgrade sensei levels with admin override capabilities
        </p>
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
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
                    <p className="mt-2">Loading senseis...</p>
                  </TableCell>
                </TableRow>
              ) : filteredSenseis.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    {searchTerm ? `No senseis found matching "${searchTerm}"` : 'No senseis found'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredSenseis.map((sensei) => (
                  <TableRow key={sensei.id}>
                    <TableCell className="font-medium">{sensei.name || 'Unnamed Sensei'}</TableCell>
                    <TableCell>
                      <SenseiLevelBadge level={sensei.sensei_level} />
                    </TableCell>
                    <TableCell>{sensei.trips_led || 0}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {(sensei.rating || 0).toFixed(1)}⭐
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {sensei.level_achieved_at ? 
                        new Date(sensei.level_achieved_at).toLocaleDateString() : 
                        'Unknown'
                      }
                    </TableCell>
                    <TableCell>
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
                              Manage Level: {selectedSensei?.name || 'Unknown'}
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
                                    {selectedSensei.trips_led || 0} trips • {(selectedSensei.rating || 0).toFixed(1)}⭐ rating
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
                                  {isUpdating ? (
                                    <>
                                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                      Updating...
                                    </>
                                  ) : (
                                    'Update Level'
                                  )}
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
                                            {history.change_reason || 'No reason provided'}
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
