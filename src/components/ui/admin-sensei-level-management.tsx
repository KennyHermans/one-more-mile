
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

  // Removed performDirectUpdate function as it's not being used and was causing JSON parsing issues

  // Input validation helper - Returns ONLY primitive values
  const validateInputs = () => {
    // Validate sensei selection
    if (!selectedSensei?.id) {
      throw new Error('No sensei selected');
    }

    // 🚨 Extract ONLY primitive values directly from state - no object references
    const senseiId = String(selectedSensei.id).trim();
    const level = String(newLevel).trim();
    const cleanReason = String(reason || '').trim();
    const override = Boolean(adminOverride);

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(senseiId)) {
      throw new Error('Invalid sensei ID format');
    }

    // Validate level
    const validLevels = ['apprentice', 'journey_guide', 'master_sensei'];
    if (!validLevels.includes(level)) {
      throw new Error('Invalid sensei level selected');
    }

    // Validate reason - ensure it's a clean string
    if (!cleanReason || cleanReason.length < 3) {
      throw new Error('Please provide a meaningful reason (at least 3 characters)');
    }

    // Check for potentially problematic characters that could cause JSON issues
    if (cleanReason.includes('\0') || cleanReason.includes('\b') || cleanReason.includes('\f')) {
      throw new Error('Reason contains invalid characters');
    }

    // 🔍 Final validation - ensure all return values are primitives
    const result = { senseiId, level, reason: cleanReason, override };
    for (const [key, value] of Object.entries(result)) {
      if (typeof value === 'object' && value !== null) {
        throw new Error(`validateInputs() returned object for ${key}: ${JSON.stringify(value)}`);
      }
    }

    console.log('✅ validateInputs() returning primitives only:', {
      ...result,
      types: {
        senseiId: typeof senseiId,
        level: typeof level,
        reason: typeof cleanReason,
        override: typeof override
      }
    });

    return result;
  };

  const updateSenseiLevel = async () => {
    try {
      setIsUpdating(true);
      setError(null);
      
      // Validate all inputs before proceeding
      const validatedInputs = validateInputs();
      
      // 🚨 PRE-FLIGHT PAYLOAD VALIDATION - Clean everything explicitly
      const senseiId = validatedInputs.senseiId;
      const selectedLevel = validatedInputs.level;
      const reason = validatedInputs.reason;
      const adminOverride = validatedInputs.override;

      // ✅ Explicit payload construction with guaranteed primitive types
      const payload = {
        p_sensei_id: String(senseiId), // ensure it's a string
        p_new_level: String(selectedLevel),
        p_reason: String(reason || ''),
        p_admin_override: Boolean(adminOverride),
      };

      // 🔍 Pre-flight validation - check for malformed values
      if (!payload.p_sensei_id || payload.p_sensei_id === 'undefined' || payload.p_sensei_id === 'null') {
        throw new Error('Invalid sensei ID: cannot be empty, undefined, or null');
      }
      if (!payload.p_new_level || payload.p_new_level === 'undefined') {
        throw new Error('Invalid level: cannot be empty or undefined');
      }
      if (typeof payload.p_admin_override !== 'boolean') {
        throw new Error('Invalid admin override: must be boolean, got ' + typeof payload.p_admin_override);
      }

      // 🔍 JSON Serialization Test - catch serialization errors early
      try {
        const serialized = JSON.stringify(payload);
        const parsed = JSON.parse(serialized);
        console.log('✅ JSON serialization test passed. Serialized payload:', serialized);
        console.log('✅ Parsed back:', parsed);
      } catch (jsonError) {
        throw new Error(`Payload contains non-JSON-serializable values: ${jsonError}`);
      }

      console.log('✅ Payload being sent to RPC:', payload);
      console.log('✅ Payload types:', {
        p_sensei_id: typeof payload.p_sensei_id,
        p_new_level: typeof payload.p_new_level,
        p_reason: typeof payload.p_reason,
        p_admin_override: typeof payload.p_admin_override
      });

      const { data, error } = await supabase.rpc('admin_update_sensei_level', payload);

      console.log('🔥 RPC RESPONSE - Data:', data);
      console.log('🔥 RPC RESPONSE - Error:', error);

      if (error) {
        console.error('RPC call error:', error);
        throw new Error(`Database function error: ${error.message}`);
      }

      // Ensure we have valid JSON response
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response from database function');
      }

      const response = data as { 
        success?: boolean; 
        error?: string; 
        previous_level?: string; 
        new_level?: string; 
        message?: string;
        debug_info?: any;
        details?: any;
      };

      console.log('Full database response:', response);

      if (response.error) {
        console.error('Function returned error:', response.error);
        
        // Include debug information in error message if available
        let errorMessage = response.error;
        if (response.debug_info) {
          console.error('Debug info:', response.debug_info);
          errorMessage += ` (Debug: ${JSON.stringify(response.debug_info)})`;
        }
        if (response.details) {
          console.error('Error details:', response.details);
          errorMessage += ` (Details: ${JSON.stringify(response.details)})`;
        }
        
        throw new Error(errorMessage);
      }

      if (response.success) {
        console.log('Level update successful:', response);
        toast({
          title: "Success",
          description: response.message || `Sensei level updated from ${response.previous_level} to ${response.new_level}`,
        });

        // Refresh data
        await fetchSenseis();
        if (selectedSensei) {
          await fetchLevelHistory(selectedSensei.id);
        }
        setReason('');
        setAdminOverride(false);
      } else {
        throw new Error('Unexpected response format from database function');
      }
    } catch (err) {
      console.error('Update failed with error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
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
