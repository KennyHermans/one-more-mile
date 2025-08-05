import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logError, logInfo } from "@/lib/error-handler";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Badge } from "./badge";
import { Button } from "./button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { useToast } from "@/hooks/use-toast";
import { handleError } from "@/lib/error-handler";
import { 
  UserCheck, 
  UserPlus, 
  AlertTriangle,
  CheckCircle,
  Clock
} from "lucide-react";

interface BackupTrip {
  id: string;
  title: string;
  destination: string;
  sensei_id?: string;
  sensei_name: string;
  backup_sensei_id?: string;
  backup_sensei?: {
    name: string;
  };
}

interface SenseiProfile {
  id: string;
  name: string;
  location: string;
  rating: number;
  specialties: string[];
}

interface BackupApplication {
  id: string;
  trip_id: string;
  sensei_id: string;
  status: string;
  applied_at: string;
  sensei_profiles: {
    name: string;
    location: string;
    rating: number;
  };
  trips: {
    title: string;
    destination: string;
  };
}

interface BackupSenseiManagementProps {
  isAdmin?: boolean;
}

export const BackupSenseiManagement: React.FC<BackupSenseiManagementProps> = ({ isAdmin = false }) => {
  const [trips, setTrips] = useState<BackupTrip[]>([]);
  const [availableSenseis, setAvailableSenseis] = useState<SenseiProfile[]>([]);
  const [backupApplications, setBackupApplications] = useState<BackupApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (isAdmin) {
      fetchTripsForAdmin();
      fetchBackupApplications();
    } else {
      fetchAvailableTripsForBackup();
      fetchMyBackupApplications();
    }
    fetchAvailableSenseis();
  }, [isAdmin]);

  const fetchTripsForAdmin = async () => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select(`
          id,
          title,
          destination,
          sensei_id,
          sensei_name,
          backup_sensei_id,
          backup_sensei:sensei_profiles!trips_backup_sensei_id_fkey(name)
        `)
        .eq('is_active', true)
        .eq('trip_status', 'approved');

      if (error) throw error;
      setTrips(data || []);
    } catch (error) {
      handleError(error, {
        component: 'BackupSenseiManagement',
        action: 'fetchTrips'
      }, false);
    }
  };

  const fetchAvailableTripsForBackup = async () => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('id, title, destination, sensei_id, sensei_name')
        .eq('is_active', true)
        .eq('trip_status', 'approved')
        .is('backup_sensei_id', null);

      if (error) throw error;
      setTrips(data || []);
    } catch (error) {
      logError(error as Error, {
        component: 'BackupSenseiManagement',
        action: 'fetchAvailableTripsForBackup'
      });
    }
  };

  const fetchAvailableSenseis = async () => {
    try {
      const { data, error } = await supabase
        .from('sensei_profiles')
        .select('id, name, location, rating, specialties')
        .eq('is_active', true)
        .eq('is_offline', false);

      if (error) throw error;
      setAvailableSenseis(data || []);
    } catch (error) {
      logError(error as Error, {
        component: 'BackupSenseiManagement',
        action: 'fetchAvailableSenseis'
      });
    }
  };

  const fetchBackupApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('backup_sensei_applications')
        .select(`
          id,
          trip_id,
          sensei_id,
          status,
          applied_at,
          sensei_profiles!backup_sensei_applications_sensei_id_fkey(name, location, rating),
          trips!backup_sensei_applications_trip_id_fkey(title, destination)
        `)
        .order('applied_at', { ascending: false });

      if (error) throw error;
      setBackupApplications(data || []);
    } catch (error) {
      logError(error as Error, {
        component: 'BackupSenseiManagement',
        action: 'fetchBackupApplications'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMyBackupApplications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('backup_sensei_applications')
        .select(`
          id,
          trip_id,
          sensei_id,
          status,
          applied_at,
          sensei_profiles!backup_sensei_applications_sensei_id_fkey(name, location, rating),
          trips!backup_sensei_applications_trip_id_fkey(title, destination)
        `)
        .eq('user_id', user.id)
        .order('applied_at', { ascending: false });

      if (error) throw error;
      setBackupApplications(data || []);
    } catch (error) {
      logError(error as Error, {
        component: 'BackupSenseiManagement',
        action: 'fetchMyBackupApplications'
      });
    } finally {
      setLoading(false);
    }
  };

  const assignBackupSensei = async (tripId: string, senseiId: string) => {
    try {
      const { error } = await supabase
        .from('trips')
        .update({ backup_sensei_id: senseiId })
        .eq('id', tripId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Backup sensei assigned successfully!",
      });

      fetchTripsForAdmin();
    } catch (error) {
      logError(error as Error, {
        component: 'BackupSenseiManagement',
        action: 'assignBackupSensei',
        metadata: { tripId, senseiId }
      });
      toast({
        title: "Error",
        description: "Failed to assign backup sensei.",
        variant: "destructive",
      });
    }
  };

  const applyForBackup = async (tripId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get sensei profile
      const { data: senseiProfile } = await supabase
        .from('sensei_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!senseiProfile) {
        toast({
          title: "Error",
          description: "Sensei profile not found.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('backup_sensei_applications')
        .insert({
          trip_id: tripId,
          sensei_id: senseiProfile.id,
          user_id: user.id,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Backup sensei application submitted!",
      });

      fetchMyBackupApplications();
    } catch (error) {
      logError(error as Error, {
        component: 'BackupSenseiManagement',
        action: 'applyForBackup',
        tripId
      });
      toast({
        title: "Error",
        description: "Failed to submit application.",
        variant: "destructive",
      });
    }
  };

  const handleApplicationStatus = async (applicationId: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('backup_sensei_applications')
        .update({ status })
        .eq('id', applicationId);

      if (error) throw error;

      // If approved, assign as backup sensei
      if (status === 'approved') {
        const application = backupApplications.find(app => app.id === applicationId);
        if (application) {
          await assignBackupSensei(application.trip_id, application.sensei_id);
        }
      }

      toast({
        title: "Success",
        description: `Application ${status} successfully!`,
      });

      fetchBackupApplications();
    } catch (error) {
      logError(error as Error, {
        component: 'BackupSenseiManagement',
        action: 'handleApplicationStatus',
        metadata: { applicationId, status }
      });
      toast({
        title: "Error",
        description: "Failed to update application status.",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive"
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || "secondary"}>
        {status}
      </Badge>
    );
  };

  if (loading) {
    return <div>Loading backup sensei management...</div>;
  }

  return (
    <div className="space-y-6">
      {isAdmin ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="w-5 h-5" />
                Backup Sensei Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trips.map((trip) => (
                  <div key={trip.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{trip.title}</h4>
                        <p className="text-sm text-muted-foreground">{trip.destination}</p>
                        <p className="text-sm">Primary Sensei: {trip.sensei_name}</p>
                        {trip.backup_sensei ? (
                          <p className="text-sm text-green-600">
                            Backup Sensei: {trip.backup_sensei.name}
                          </p>
                        ) : (
                          <p className="text-sm text-yellow-600">No backup sensei assigned</p>
                        )}
                      </div>
                      {!trip.backup_sensei_id && (
                        <Select
                          onValueChange={(senseiId) => assignBackupSensei(trip.id, senseiId)}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Assign backup sensei" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableSenseis
                              .filter(sensei => sensei.id !== trip.sensei_id)
                              .map((sensei) => (
                                <SelectItem key={sensei.id} value={sensei.id}>
                                  {sensei.name} ({sensei.location})
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Backup Sensei Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {backupApplications.map((application) => (
                  <div key={application.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{application.sensei_profiles.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Applied for: {application.trips.title} - {application.trips.destination}
                        </p>
                        <p className="text-sm">
                          Location: {application.sensei_profiles.location} | 
                          Rating: ⭐ {application.sensei_profiles.rating}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Applied: {new Date(application.applied_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(application.status)}
                        {getStatusBadge(application.status)}
                        {application.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApplicationStatus(application.id, 'approved')}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleApplicationStatus(application.id, 'rejected')}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {backupApplications.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">
                    No backup sensei applications yet.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Available Trips for Backup
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trips.map((trip) => (
                  <div key={trip.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{trip.title}</h4>
                        <p className="text-sm text-muted-foreground">{trip.destination}</p>
                        <p className="text-sm">Primary Sensei: {trip.sensei_name}</p>
                        <p className="text-sm text-yellow-600">No backup sensei assigned</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => applyForBackup(trip.id)}
                        disabled={backupApplications.some(app => app.trip_id === trip.id)}
                      >
                        {backupApplications.some(app => app.trip_id === trip.id) 
                          ? 'Applied' 
                          : 'Apply as Backup'
                        }
                      </Button>
                    </div>
                  </div>
                ))}
                {trips.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">
                    No trips available for backup applications.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>My Backup Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {backupApplications.map((application) => (
                  <div key={application.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold">
                          {application.trips.title} - {application.trips.destination}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Applied: {new Date(application.applied_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(application.status)}
                        {getStatusBadge(application.status)}
                      </div>
                    </div>
                  </div>
                ))}
                {backupApplications.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">
                    You haven't applied for any backup sensei positions yet.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};