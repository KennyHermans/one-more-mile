import { useState, useEffect } from "react";
import { Navigation } from "@/components/ui/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SenseiPermissionsDialog } from "@/components/ui/sensei-permissions-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Download, 
  Check, 
  X,
  Plus,
  Edit2,
  Trash2,
  Star,
  MapPin,
  Calendar,
  Users,
  Settings,
  TrendingUp,
  UserCheck,
  Plane
} from "lucide-react";

interface Application {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  location: string;
  expertise_areas: string[];
  languages: string[];
  status: string;
  created_at: string;
  bio: string;
  why_sensei: string;
  years_experience: number;
  portfolio_url?: string;
  reference_text?: string;
  availability: string;
  cv_file_url?: string;
}

interface Trip {
  id: string;
  title: string;
  destination: string;
  description: string;
  price: string;
  dates: string;
  group_size: string;
  sensei_name: string;
  sensei_id: string | null;
  image_url: string;
  theme: string;
  rating: number;
  duration_days: number;
  difficulty_level: string;
  max_participants: number;
  current_participants: number;
  is_active: boolean;
  program: any[];
  included_amenities: string[];
  excluded_items: string[];
  requirements: string[];
}

interface SenseiProfile {
  id: string;
  name: string;
  specialty: string;
  experience: string;
  location: string;
  user_id: string;
}

const AdminDashboard = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [senseis, setSenseis] = useState<SenseiProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [selectedTripForPermissions, setSelectedTripForPermissions] = useState<string>("");
  const { toast } = useToast();

  // Stats
  const pendingApplications = applications.filter(app => app.status === 'pending').length;
  const approvedApplications = applications.filter(app => app.status === 'approved').length;
  const activeTrips = trips.filter(trip => trip.is_active).length;
  const totalSenseis = senseis.length;

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || user.email !== 'kenny_hermans93@hotmail.com') {
        toast({
          title: "Access Denied",
          description: "You don't have permission to access this page.",
          variant: "destructive",
        });
        window.location.href = '/';
        return;
      }
      
      setUser(user);
      await Promise.all([fetchApplications(), fetchTrips(), fetchSenseis()]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to authenticate.",
        variant: "destructive",
      });
      window.location.href = '/';
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  };

  const fetchTrips = async () => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const transformedData = (data || []).map(trip => ({
        ...trip,
        program: typeof trip.program === 'string' 
          ? JSON.parse(trip.program) 
          : Array.isArray(trip.program) 
            ? trip.program 
            : []
      })) as Trip[];
      
      setTrips(transformedData);
    } catch (error) {
      console.error('Error fetching trips:', error);
    }
  };

  const fetchSenseis = async () => {
    try {
      const { data, error } = await supabase
        .from('sensei_profiles')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      setSenseis(data || []);
    } catch (error) {
      console.error('Error fetching senseis:', error);
    }
  };

  const approveApplication = async (application: Application) => {
    setProcessing(application.id);
    try {
      const { error: updateError } = await supabase
        .from('applications')
        .update({ status: 'approved' })
        .eq('id', application.id);

      if (updateError) throw updateError;

      const { error: insertError } = await supabase
        .from('sensei_profiles')
        .insert({
          user_id: application.user_id,
          name: application.full_name,
          specialty: application.expertise_areas[0] || 'General',
          bio: application.bio,
          experience: `${application.years_experience} years`,
          location: application.location,
          specialties: application.expertise_areas,
          is_active: true,
          rating: 0.0,
          trips_led: 0
        });

      if (insertError) throw insertError;

      toast({
        title: "Application Approved",
        description: `${application.full_name} has been approved as a Sensei!`,
      });

      await Promise.all([fetchApplications(), fetchSenseis()]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve application.",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  const rejectApplication = async (application: Application) => {
    setProcessing(application.id);
    try {
      const { error } = await supabase
        .from('applications')
        .update({ status: 'rejected' })
        .eq('id', application.id);

      if (error) throw error;

      toast({
        title: "Application Rejected",
        description: `${application.full_name}'s application has been rejected.`,
      });

      fetchApplications();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject application.",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    if (!confirm('Are you sure you want to delete this trip?')) return;

    try {
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Trip deleted successfully!",
      });

      fetchTrips();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete trip.",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Navigation />
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Admin Dashboard
          </h1>
          <p className="text-lg text-gray-600">
            Manage your platform from one central location
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Applications</p>
                  <p className="text-2xl font-bold">{pendingApplications}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Senseis</p>
                  <p className="text-2xl font-bold">{totalSenseis}</p>
                </div>
                <UserCheck className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Trips</p>
                  <p className="text-2xl font-bold">{activeTrips}</p>
                </div>
                <Plane className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Applications</p>
                  <p className="text-2xl font-bold">{applications.length}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="applications" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="applications">
              Applications {pendingApplications > 0 && <Badge className="ml-2">{pendingApplications}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="trips">Trips & Senseis</TabsTrigger>
          </TabsList>

          {/* Applications Tab */}
          <TabsContent value="applications" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Sensei Applications</h2>
              <Badge variant="outline" className="text-sm">
                {pendingApplications} pending review
              </Badge>
            </div>

            {applications.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-gray-600">No applications found.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {applications.slice(0, 10).map((application) => (
                  <Card key={application.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="text-lg font-semibold">{application.full_name}</h3>
                              <p className="text-gray-600">{application.email}</p>
                              <p className="text-gray-600">{application.location}</p>
                              <p className="text-sm text-gray-500">
                                {new Date(application.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge className={`flex items-center gap-1 ${getStatusColor(application.status)}`}>
                                {getStatusIcon(application.status)}
                                {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                              </Badge>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedApplication(application)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                            </div>
                          </div>
                          
                          <div className="grid md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <h4 className="font-semibold mb-2">Expertise Areas</h4>
                              <div className="flex flex-wrap gap-1">
                                {application.expertise_areas.slice(0, 3).map((area) => (
                                  <Badge key={area} variant="secondary" className="text-xs">
                                    {area}
                                  </Badge>
                                ))}
                                {application.expertise_areas.length > 3 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{application.expertise_areas.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div>
                              <h4 className="font-semibold mb-2">Experience</h4>
                              <p className="text-sm text-gray-600">{application.years_experience} years</p>
                            </div>
                          </div>
                          
                          {application.status === 'pending' && (
                            <div className="flex gap-2 pt-4 border-t">
                              <Button
                                onClick={() => approveApplication(application)}
                                disabled={processing === application.id}
                                className="bg-green-600 hover:bg-green-700"
                                size="sm"
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => rejectApplication(application)}
                                disabled={processing === application.id}
                                size="sm"
                              >
                                <X className="w-4 h-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Trips Tab */}
          <TabsContent value="trips" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Trip Management</h2>
              <div className="flex gap-2">
                <Button onClick={() => window.location.href = '/admin/trips'}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add New Trip
                </Button>
              </div>
            </div>

            {trips.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-gray-600">No trips found.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {trips.slice(0, 8).map((trip) => (
                  <Card key={trip.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="text-lg font-semibold">{trip.title}</h3>
                              <p className="text-gray-600 flex items-center">
                                <MapPin className="w-4 h-4 mr-1" />
                                {trip.destination}
                              </p>
                              <p className="text-gray-600 flex items-center">
                                <Calendar className="w-4 h-4 mr-1" />
                                {trip.dates}
                              </p>
                              {trip.sensei_name && (
                                <p className="text-sm text-gray-500">
                                  Sensei: {trip.sensei_name}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={trip.is_active ? "default" : "secondary"}>
                                {trip.is_active ? "Active" : "Inactive"}
                              </Badge>
                              <div className="flex gap-1">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => window.location.href = `/admin/trips`}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                {trip.sensei_id && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      setSelectedTripForPermissions(trip.id);
                                      setPermissionsDialogOpen(true);
                                    }}
                                  >
                                    <Settings className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleDeleteTrip(trip.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid md:grid-cols-3 gap-4">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Price</p>
                              <p className="text-sm">{trip.price}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600">Group Size</p>
                              <p className="text-sm">{trip.group_size}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600">Duration</p>
                              <p className="text-sm">{trip.duration_days} days</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Application Details Modal */}
        {selectedApplication && (
          <Dialog open={!!selectedApplication} onOpenChange={() => setSelectedApplication(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedApplication.full_name}</DialogTitle>
              </DialogHeader>
              
              <div className="grid md:grid-cols-2 gap-6 mt-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Contact Information</h3>
                    <p><strong>Email:</strong> {selectedApplication.email}</p>
                    <p><strong>Location:</strong> {selectedApplication.location}</p>
                    <p><strong>Experience:</strong> {selectedApplication.years_experience} years</p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Expertise Areas</h3>
                    <div className="flex flex-wrap gap-1">
                      {selectedApplication.expertise_areas.map((area) => (
                        <Badge key={area} variant="secondary">{area}</Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Languages</h3>
                    <div className="flex flex-wrap gap-1">
                      {selectedApplication.languages.map((language) => (
                        <Badge key={language} variant="outline">{language}</Badge>
                      ))}
                    </div>
                  </div>

                  {selectedApplication.portfolio_url && (
                    <div>
                      <h3 className="font-semibold mb-2">Portfolio</h3>
                      <a 
                        href={selectedApplication.portfolio_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {selectedApplication.portfolio_url}
                      </a>
                    </div>
                  )}

                  {selectedApplication.cv_file_url && (
                    <div>
                      <h3 className="font-semibold mb-2">CV/Resume</h3>
                      <a 
                        href={selectedApplication.cv_file_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 text-blue-600 hover:underline"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download CV</span>
                      </a>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Professional Bio</h3>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {selectedApplication.bio}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Why Sensei?</h3>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {selectedApplication.why_sensei}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Availability</h3>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {selectedApplication.availability}
                    </p>
                  </div>

                  {selectedApplication.reference_text && (
                    <div>
                      <h3 className="font-semibold mb-2">References</h3>
                      <p className="text-gray-700 text-sm leading-relaxed">
                        {selectedApplication.reference_text}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {selectedApplication.status === 'pending' && (
                <div className="mt-6 pt-6 border-t flex gap-4">
                  <Button
                    onClick={() => {
                      approveApplication(selectedApplication);
                      setSelectedApplication(null);
                    }}
                    disabled={processing === selectedApplication.id}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Approve Application
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      rejectApplication(selectedApplication);
                      setSelectedApplication(null);
                    }}
                    disabled={processing === selectedApplication.id}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Reject Application
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        )}

        {/* Sensei Permissions Dialog */}
        <SenseiPermissionsDialog
          isOpen={permissionsDialogOpen}
          onClose={() => setPermissionsDialogOpen(false)}
          tripId={selectedTripForPermissions}
          onSave={() => {
            setPermissionsDialogOpen(false);
            // Optionally refresh data
          }}
        />
      </div>
    </div>
  );
};

export default AdminDashboard;