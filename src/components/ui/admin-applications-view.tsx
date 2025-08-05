import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { Button } from "./button";
import { Badge } from "./badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Clock, CheckCircle, XCircle, Eye, Download, Check, X, User, MapPin, Calendar } from "lucide-react";

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

export function AdminApplicationsView() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setIsLoading(false);
    }
  };

  const approveApplication = async (application: Application) => {
    setProcessing(application.id);
    try {
      // Update application status
      const { error: updateError } = await supabase
        .from('applications')
        .update({ status: 'approved' })
        .eq('id', application.id);

      if (updateError) throw updateError;

      // Create sensei profile
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

      toast.success(`${application.full_name} has been approved as a Sensei!`);
      fetchApplications();
    } catch (error) {
      console.error('Error approving application:', error);
      toast.error('Failed to approve application');
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

      toast.success(`${application.full_name}'s application has been rejected`);
      fetchApplications();
    } catch (error) {
      console.error('Error rejecting application:', error);
      toast.error('Failed to reject application');
    } finally {
      setProcessing(null);
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

  const pendingApplications = applications.filter(app => app.status === 'pending');

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">Loading applications...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sensei Applications</CardTitle>
          <CardDescription>
            Review and approve new sensei applications
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingApplications.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4 text-amber-700">
                Pending Applications ({pendingApplications.length})
              </h3>
              <div className="space-y-4">
                {pendingApplications.map((application) => (
                  <div key={application.id} className="border border-amber-200 rounded-lg p-4 bg-amber-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4" />
                          <span className="font-semibold">{application.full_name}</span>
                          <span className="text-sm text-muted-foreground">({application.email})</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {application.location}
                          </div>
                          <div>{application.years_experience} years experience</div>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-2">
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
                        <div className="text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3 inline mr-1" />
                          Applied on {new Date(application.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedApplication(application)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Review
                            </Button>
                          </DialogTrigger>
                        </Dialog>
                        <Button
                          onClick={() => approveApplication(application)}
                          disabled={processing === application.id}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
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
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {applications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No applications found.
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-semibold mb-4">All Applications</h3>
              <div className="space-y-3">
                {applications.map((application) => (
                  <div key={application.id} className="flex justify-between items-center p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-medium">{application.full_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {application.location} • {new Date(application.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={`flex items-center gap-1 ${getStatusColor(application.status)}`}>
                        {getStatusIcon(application.status)}
                        {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                      </Badge>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedApplication(application)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </DialogTrigger>
                      </Dialog>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Application Details Dialog */}
      {selectedApplication && (
        <Dialog open={!!selectedApplication} onOpenChange={() => setSelectedApplication(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedApplication.full_name}</DialogTitle>
              <DialogDescription>
                Application details and review
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid md:grid-cols-2 gap-6">
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
                      <Badge key={area} variant="secondary">
                        {area}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Languages</h3>
                  <div className="flex flex-wrap gap-1">
                    {selectedApplication.languages.map((language) => (
                      <Badge key={language} variant="outline">
                        {language}
                      </Badge>
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
    </div>
  );
}