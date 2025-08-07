import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Crown, Clock, X, Plus, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TripSpecificPermission {
  id: string;
  trip_id: string;
  sensei_id: string;
  elevated_level: string;
  granted_reason: string;
  granted_at: string;
  expires_at: string | null;
  is_active: boolean;
  sensei_profiles: {
    name: string;
    sensei_level: string;
  };
  trips: {
    title: string;
    required_permission_level: string;
  };
}

export const AdminTripSpecificPermissions = () => {
  const [permissions, setPermissions] = useState<TripSpecificPermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState("");
  const [selectedSenseiId, setSelectedSenseiId] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [reason, setReason] = useState("");
  const [trips, setTrips] = useState<any[]>([]);
  const [senseis, setSenseis] = useState<any[]>([]);
  const { toast } = useToast();

  const fetchPermissions = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching trip-specific permissions...');
      
      // First verify admin status
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User not authenticated');
        toast({
          title: "Authentication Error",
          description: "You must be logged in to access this feature",
          variant: "destructive",
        });
        return;
      }

      // Check admin status using RPC
      const { data: isAdminResult, error: adminError } = await supabase
        .rpc('is_admin', { user_id: user.id });

      if (adminError) {
        console.error('Error checking admin status:', adminError);
        toast({
          title: "Permission Error",
          description: "Unable to verify admin permissions",
          variant: "destructive",
        });
        return;
      }

      if (!isAdminResult) {
        console.error('User is not an admin');
        toast({
          title: "Access Denied",
          description: "You do not have permission to access this feature",
          variant: "destructive",
        });
        return;
      }

      // Now fetch the permissions with the updated RLS policy
      const { data, error } = await supabase
        .from('trip_specific_permissions')
        .select(`
          *,
          sensei_profiles!trip_specific_permissions_sensei_id_fkey(name, sensei_level),
          trips!trip_specific_permissions_trip_id_fkey(title, required_permission_level)
        `)
        .eq('is_active', true)
        .order('granted_at', { ascending: false });

      if (error) {
        console.error('Error fetching permissions:', error);
        
        // Provide more specific error messages
        if (error.code === 'PGRST116') {
          toast({
            title: "Access Denied",
            description: "Row Level Security policy blocked access. Please ensure you have admin permissions.",
            variant: "destructive",
          });
        } else if (error.message?.includes('JWT')) {
          toast({
            title: "Authentication Error", 
            description: "Session expired. Please refresh and try again.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Database Error",
            description: `Failed to fetch trip-specific permissions: ${error.message}`,
            variant: "destructive",
          });
        }
        return;
      }
      
      // Filter out any records where the joins failed
      const validPermissions = (data || []).filter(
        (permission: any) => 
          permission.sensei_profiles && 
          permission.trips &&
          permission.sensei_profiles.name &&
          permission.trips.title
      );
      
      console.log('Fetched permissions:', validPermissions);
      setPermissions(validPermissions as unknown as TripSpecificPermission[]);
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error", 
        description: "An unexpected error occurred while fetching permissions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTripsAndSenseis = async () => {
    try {
      const [tripsResponse, senseisResponse] = await Promise.all([
        supabase
          .from('trips')
          .select('id, title, sensei_id, required_permission_level')
          .eq('is_active', true),
        supabase
          .from('sensei_profiles')
          .select('id, name, sensei_level')
          .eq('is_active', true)
      ]);

      if (tripsResponse.error) throw tripsResponse.error;
      if (senseisResponse.error) throw senseisResponse.error;

      setTrips(tripsResponse.data || []);
      setSenseis(senseisResponse.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleGrantPermission = async () => {
    if (!selectedTripId || !selectedSenseiId || !selectedLevel) {
      toast({
        title: "Missing Information",
        description: "Please select trip, sensei, and permission level",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.rpc('grant_trip_specific_permission', {
        p_trip_id: selectedTripId,
        p_sensei_id: selectedSenseiId,
        p_elevated_level: selectedLevel,
        p_reason: reason || 'Manually granted by admin'
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Trip-specific permission granted successfully",
      });

      setIsDialogOpen(false);
      setSelectedTripId("");
      setSelectedSenseiId("");
      setSelectedLevel("");
      setReason("");
      fetchPermissions();
    } catch (error) {
      console.error('Error granting permission:', error);
      toast({
        title: "Error",
        description: "Failed to grant permission",
        variant: "destructive",
      });
    }
  };

  const handleRevokePermission = async (tripId: string, senseiId: string) => {
    try {
      const { error } = await supabase.rpc('revoke_trip_specific_permission', {
        p_trip_id: tripId,
        p_sensei_id: senseiId
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Permission revoked successfully",
      });

      fetchPermissions();
    } catch (error) {
      console.error('Error revoking permission:', error);
      toast({
        title: "Error",
        description: "Failed to revoke permission",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchPermissions();
    fetchTripsAndSenseis();
  }, []);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'master_sensei': return 'text-accent';
      case 'journey_guide': return 'text-primary';
      case 'apprentice': return 'text-muted-foreground';
      default: return 'text-foreground';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-accent" />
            Trip-Specific Permissions
          </CardTitle>
          <CardDescription>
            Manage elevated permissions for specific trips and senseis
          </CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => fetchTripsAndSenseis()}>
              <Plus className="h-4 w-4 mr-2" />
              Grant Permission
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Grant Trip-Specific Permission</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="trip-select">Trip</Label>
                <Select value={selectedTripId} onValueChange={setSelectedTripId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select trip" />
                  </SelectTrigger>
                  <SelectContent>
                    {trips.map((trip) => (
                      <SelectItem key={trip.id} value={trip.id}>
                        {trip.title} (Requires: {trip.required_permission_level})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="sensei-select">Sensei</Label>
                <Select value={selectedSenseiId} onValueChange={setSelectedSenseiId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sensei" />
                  </SelectTrigger>
                  <SelectContent>
                    {senseis.map((sensei) => (
                      <SelectItem key={sensei.id} value={sensei.id}>
                        {sensei.name} ({sensei.sensei_level})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="level-select">Elevated Permission Level</Label>
                <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apprentice">Apprentice</SelectItem>
                    <SelectItem value="journey_guide">Journey Guide</SelectItem>
                    <SelectItem value="master_sensei">Master Sensei</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Optional reason for granting this permission"
                />
              </div>

              <Button onClick={handleGrantPermission} className="w-full">
                Grant Permission
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {permissions.length === 0 ? (
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No active trip-specific permissions found
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {permissions.map((permission) => (
              <div
                key={permission.id}
                className="flex items-center justify-between p-4 border rounded-lg bg-secondary/20"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-accent/10 text-accent">
                      <Crown className="h-3 w-3 mr-1" />
                      {permission.elevated_level.replace('_', ' ')}
                    </Badge>
                    <Badge variant="secondary">
                      <Clock className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                  <h4 className="font-medium">{permission.trips.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    <span className={getLevelColor(permission.sensei_profiles.sensei_level)}>
                      {permission.sensei_profiles.name}
                    </span>
                    {' '}({permission.sensei_profiles.sensei_level.replace('_', ' ')})
                  </p>
                  {permission.granted_reason && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Reason: {permission.granted_reason}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Granted: {new Date(permission.granted_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRevokePermission(permission.trip_id, permission.sensei_id)}
                >
                  <X className="h-4 w-4 mr-2" />
                  Revoke
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};