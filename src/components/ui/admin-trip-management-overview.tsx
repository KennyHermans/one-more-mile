import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Badge } from "./badge";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./dialog";
import { SenseiPermissionsDialog } from "./sensei-permissions-dialog";
import { BackupSenseiManagement } from "./backup-sensei-management";
import { useToast } from "@/hooks/use-toast";
import { handleError } from "@/lib/error-handler";
import { 
  Search, 
  Filter, 
  Settings, 
  User, 
  Users, 
  Building2, 
  Eye,
  Edit2,
  UserCheck,
  AlertTriangle,
  CheckCircle,
  XCircle
} from "lucide-react";

import { Trip } from '@/types/trip';
import { transformToTripArray } from '@/types/trip-utils';

interface TripOverviewExtended extends Trip {
  // Additional properties for overview
}

interface SenseiProfile {
  id: string;
  name: string;
  user_id: string;
  specialties: string[];
  location: string;
  rating: number;
  is_active: boolean;
}

interface TripPermission {
  trip_id: string;
  sensei_id: string;
  permissions: any;
  sensei_name?: string;
}

interface TripOverviewItem extends TripOverviewExtended {
  assigned_sensei?: SenseiProfile;
  permissions: TripPermission[];
  permission_count: number;
  creator_type: 'admin' | 'sensei';
  creator_name: string;
}

export function AdminTripManagementOverview() {
  const [trips, setTrips] = useState<TripOverviewItem[]>([]);
  const [senseis, setSenseis] = useState<SenseiProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCreator, setFilterCreator] = useState<"all" | "admin" | "sensei">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "approved" | "pending" | "draft">("all");
  const [filterAssignment, setFilterAssignment] = useState<"all" | "assigned" | "unassigned">("all");
  const [selectedTripForPermissions, setSelectedTripForPermissions] = useState<string>("");
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<TripPermission[]>([]);
  const [permissionsDialogTripId, setPermissionsDialogTripId] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchTrips(), fetchSenseis(), fetchPermissions()]);
    } catch (error) {
      handleError(error, {
        component: 'AdminTripManagementOverview',
        action: 'fetchData'
      }, true, "Failed to load trip management data");
    } finally {
      setLoading(false);
    }
  };

  const fetchTrips = async () => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const transformedTrips = transformToTripArray(data || []);
      const processedTrips = transformedTrips.map(trip => ({
        ...trip,
        creator_type: trip.created_by_sensei ? 'sensei' as const : 'admin' as const,
        creator_name: trip.created_by_sensei ? trip.sensei_name : 'One More Mile',
        permissions: [],
        permission_count: 0
      }));
      
      setTrips(processedTrips);
    } catch (error) {
      handleError(error, {
        component: 'AdminTripManagementOverview',
        action: 'fetchTrips'
      }, false);
    }
  };

  const fetchSenseis = async () => {
    try {
      const { data, error } = await supabase
        .from('sensei_profiles')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setSenseis(data || []);
    } catch (error) {
      handleError(error, {
        component: 'AdminTripManagementOverview',
        action: 'fetchSenseis'
      }, false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('trip_permissions')
        .select(`
          trip_id,
          sensei_id,
          permissions,
          sensei_profiles!inner(name)
        `);

      if (error) throw error;
      
      // Group permissions by trip
      const permissionsByTrip: { [tripId: string]: TripPermission[] } = {};
      (data || []).forEach(permission => {
        const tripId = permission.trip_id;
        if (!permissionsByTrip[tripId]) {
          permissionsByTrip[tripId] = [];
        }
        permissionsByTrip[tripId].push({
          ...permission,
          sensei_name: (permission.sensei_profiles as any)?.name
        });
      });

      // Update trips with permission data
      setTrips(prev => prev.map(trip => {
        const tripPermissions = permissionsByTrip[trip.id] || [];
        const assignedSensei = senseis.find(s => s.id === trip.sensei_id);
        
        return {
          ...trip,
          permissions: tripPermissions,
          permission_count: tripPermissions.length,
          assigned_sensei: assignedSensei
        };
      }));
    } catch (error) {
      handleError(error, {
        component: 'AdminTripManagementOverview',
        action: 'fetchPermissions'
      }, false);
    }
  };

  const handleViewPermissions = (trip: TripOverviewItem) => {
    setSelectedPermissions(trip.permissions);
    setPermissionsDialogTripId(trip.id);
    setPermissionsDialogOpen(true);
  };

  const handleManagePermissions = (tripId: string) => {
    setSelectedTripForPermissions(tripId);
    setPermissionsDialogOpen(true);
  };

  const assignSenseiToTrip = async (tripId: string, senseiId: string) => {
    try {
      const sensei = senseis.find(s => s.id === senseiId);
      if (!sensei) return;

      const { error } = await supabase
        .from('trips')
        .update({ 
          sensei_id: senseiId,
          sensei_name: sensei.name
        })
        .eq('id', tripId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Sensei assigned to trip successfully",
      });
      
      fetchData();
    } catch (error) {
      handleError(error, {
        component: 'AdminTripManagementOverview',
        action: 'assignSensei',
        tripId: tripId
      }, true, "Failed to assign sensei to trip");
    }
  };

  // Filter trips based on search and filters
  const filteredTrips = trips.filter(trip => {
    const matchesSearch = 
      trip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trip.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trip.creator_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trip.sensei_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCreator = 
      filterCreator === "all" || trip.creator_type === filterCreator;

    const matchesStatus = 
      filterStatus === "all" || trip.trip_status === filterStatus;

    const matchesAssignment = 
      filterAssignment === "all" || 
      (filterAssignment === "assigned" && trip.sensei_id) ||
      (filterAssignment === "unassigned" && !trip.sensei_id);

    return matchesSearch && matchesCreator && matchesStatus && matchesAssignment;
  });

  // Statistics
  const stats = {
    total: trips.length,
    adminCreated: trips.filter(t => t.creator_type === 'admin').length,
    senseiCreated: trips.filter(t => t.creator_type === 'sensei').length,
    assigned: trips.filter(t => t.sensei_id).length,
    unassigned: trips.filter(t => !t.sensei_id).length,
    withPermissions: trips.filter(t => t.permission_count > 0).length
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trip Management Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading trip management data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total Trips</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.adminCreated}</div>
              <div className="text-sm text-muted-foreground">Admin Created</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.senseiCreated}</div>
              <div className="text-sm text-muted-foreground">Sensei Created</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">{stats.assigned}</div>
              <div className="text-sm text-muted-foreground">Assigned</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.unassigned}</div>
              <div className="text-sm text-muted-foreground">Unassigned</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.withPermissions}</div>
              <div className="text-sm text-muted-foreground">With Permissions</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Trip Management Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div>
              <Label htmlFor="search">Search Trips</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by title, destination..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="creator-filter">Creator</Label>
              <Select value={filterCreator} onValueChange={(value: any) => setFilterCreator(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Creators</SelectItem>
                  <SelectItem value="admin">Admin (One More Mile)</SelectItem>
                  <SelectItem value="sensei">Sensei Created</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending_approval">Pending</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="assignment-filter">Assignment</Label>
              <Select value={filterAssignment} onValueChange={(value: any) => setFilterAssignment(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Trips</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchQuery("");
                  setFilterCreator("all");
                  setFilterStatus("all");
                  setFilterAssignment("all");
                }}
                className="w-full"
              >
                <Filter className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </div>

          {/* Results Summary */}
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              Showing {filteredTrips.length} of {trips.length} trips
            </p>
          </div>

          {/* Trips Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trip</TableHead>
                  <TableHead>Creator</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned Sensei</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Participants</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrips.map((trip) => (
                  <TableRow key={trip.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{trip.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {trip.destination} • {trip.theme}
                        </div>
                        <div className="text-xs text-muted-foreground">{trip.dates}</div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {trip.creator_type === 'admin' ? (
                          <Building2 className="h-4 w-4 text-blue-600" />
                        ) : (
                          <User className="h-4 w-4 text-green-600" />
                        )}
                        <div>
                          <div className="font-medium">{trip.creator_name}</div>
                          <Badge variant={trip.creator_type === 'admin' ? 'default' : 'secondary'}>
                            {trip.creator_type === 'admin' ? 'Admin' : 'Sensei'}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant={
                        trip.trip_status === 'approved' ? 'default' :
                        trip.trip_status === 'pending_approval' ? 'secondary' :
                        'outline'
                      }>
                        {trip.trip_status === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {trip.trip_status === 'pending_approval' && <AlertTriangle className="h-3 w-3 mr-1" />}
                        {trip.trip_status === 'draft' && <XCircle className="h-3 w-3 mr-1" />}
                        {trip.trip_status?.replace('_', ' ')?.toUpperCase()}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      {trip.sensei_id ? (
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-green-600" />
                          <span className="font-medium">{trip.sensei_name}</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Badge variant="outline">Unassigned</Badge>
                          <Select onValueChange={(senseiId) => assignSenseiToTrip(trip.id, senseiId)}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Assign Sensei" />
                            </SelectTrigger>
                            <SelectContent>
                              {senseis.map((sensei) => (
                                <SelectItem key={sensei.id} value={sensei.id}>
                                  {sensei.name} ({sensei.location})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={trip.permission_count > 0 ? 'default' : 'outline'}>
                          {trip.permission_count} Sensei{trip.permission_count !== 1 ? 's' : ''}
                        </Badge>
                        {trip.permission_count > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewPermissions(trip)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{trip.current_participants}/{trip.max_participants}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleManagePermissions(trip.id)}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Manage
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredTrips.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No trips found matching your criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permissions View Dialog */}
      <Dialog open={permissionsDialogOpen && selectedPermissions.length > 0} onOpenChange={() => {
        if (selectedPermissions.length > 0) {
          setPermissionsDialogOpen(false);
          setSelectedPermissions([]);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Trip Permissions Overview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedPermissions.map((permission) => (
              <Card key={permission.sensei_id}>
                <CardHeader>
                  <CardTitle className="text-lg">{permission.sensei_name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(permission.permissions).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{key.replace('_', ' ')}</span>
                        <Badge variant={value ? 'default' : 'outline'}>
                          {value ? 'Allowed' : 'Denied'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Permissions Management Dialog */}
      <SenseiPermissionsDialog
        tripId={selectedTripForPermissions}
        isOpen={permissionsDialogOpen && !selectedPermissions.length}
        onClose={() => {
          setPermissionsDialogOpen(false);
          setSelectedTripForPermissions("");
        }}
        onSave={() => {
          fetchData();
          setPermissionsDialogOpen(false);
          setSelectedTripForPermissions("");
        }}
      />
    </div>
  );
}