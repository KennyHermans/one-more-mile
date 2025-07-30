import { Navigation } from "@/components/ui/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Clock, CheckCircle, XCircle, Eye } from "lucide-react";

interface Application {
  id: string;
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
}

const MyApplications = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to view your applications.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setApplications(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load your applications.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Navigation />
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading your applications...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            My Applications
          </h1>
          <p className="text-lg text-gray-600">
            Track the status of your Sensei applications
          </p>
        </div>

        {applications.length === 0 ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6 text-center">
              <p className="text-gray-600 mb-4">You haven't submitted any applications yet.</p>
              <Button asChild>
                <a href="/become-sensei">Submit Your First Application</a>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {applications.map((application) => (
              <Card key={application.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">{application.full_name}</CardTitle>
                      <p className="text-gray-600">{application.location}</p>
                      <p className="text-sm text-gray-500">
                        Submitted on {new Date(application.created_at).toLocaleDateString()}
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
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
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
                      <h4 className="font-semibold mb-2">Languages</h4>
                      <div className="flex flex-wrap gap-1">
                        {application.languages.slice(0, 3).map((language) => (
                          <Badge key={language} variant="outline" className="text-xs">
                            {language}
                          </Badge>
                        ))}
                        {application.languages.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{application.languages.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {application.bio}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Application Details Modal */}
        {selectedApplication && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">{selectedApplication.full_name}</h2>
                    <p className="text-gray-600">{selectedApplication.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={`flex items-center gap-1 ${getStatusColor(selectedApplication.status)}`}>
                      {getStatusIcon(selectedApplication.status)}
                      {selectedApplication.status.charAt(0).toUpperCase() + selectedApplication.status.slice(1)}
                    </Badge>
                    <Button variant="outline" onClick={() => setSelectedApplication(null)}>
                      Close
                    </Button>
                  </div>
                </div>

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

                <div className="mt-6 pt-6 border-t">
                  <p className="text-sm text-gray-500">
                    Application submitted on {new Date(selectedApplication.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyApplications;