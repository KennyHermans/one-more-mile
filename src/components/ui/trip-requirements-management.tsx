import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Badge } from "./badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Textarea } from "./textarea";
import { Switch } from "./switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  FileText, 
  Award,
  AlertTriangle,
  Trash2,
  Edit,
  CheckCircle
} from "lucide-react";

interface TripRequirement {
  id: string;
  requirement_type: string;
  requirement_name: string;
  requirement_description?: string;
  is_mandatory: boolean;
  minimum_level?: string;
  created_at: string;
}

export function TripRequirementsManagement({ tripId }: { tripId: string }) {
  const [requirements, setRequirements] = useState<TripRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingRequirement, setIsAddingRequirement] = useState(false);
  const { toast } = useToast();

  // Requirement form state
  const [requirementForm, setRequirementForm] = useState({
    requirement_type: "certificate",
    requirement_name: "",
    requirement_description: "",
    is_mandatory: true,
    minimum_level: ""
  });

  const requirementTypes = [
    { value: "certificate", label: "Certificate" },
    { value: "skill", label: "Skill" },
    { value: "experience", label: "Experience" },
    { value: "physical", label: "Physical Requirement" }
  ];

  const minimumLevels = [
    { value: "beginner", label: "Beginner" },
    { value: "intermediate", label: "Intermediate" },
    { value: "advanced", label: "Advanced" },
    { value: "expert", label: "Expert" }
  ];

  useEffect(() => {
    fetchRequirements();
  }, [tripId]);

  const fetchRequirements = async () => {
    try {
      const { data, error } = await supabase
        .from("trip_requirements")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequirements(data || []);
    } catch (error) {
      console.error("Error fetching requirements:", error);
      toast({
        title: "Error",
        description: "Failed to load trip requirements",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddRequirement = async () => {
    try {
      const { error } = await supabase
        .from("trip_requirements")
        .insert({
          trip_id: tripId,
          requirement_type: requirementForm.requirement_type,
          requirement_name: requirementForm.requirement_name,
          requirement_description: requirementForm.requirement_description || null,
          is_mandatory: requirementForm.is_mandatory,
          minimum_level: requirementForm.minimum_level || null
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Requirement added successfully"
      });

      setRequirementForm({
        requirement_type: "certificate",
        requirement_name: "",
        requirement_description: "",
        is_mandatory: true,
        minimum_level: ""
      });
      setIsAddingRequirement(false);
      fetchRequirements();
    } catch (error) {
      console.error("Error adding requirement:", error);
      toast({
        title: "Error",
        description: "Failed to add requirement",
        variant: "destructive"
      });
    }
  };

  const handleDeleteRequirement = async (requirementId: string) => {
    try {
      const { error } = await supabase
        .from("trip_requirements")
        .delete()
        .eq("id", requirementId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Requirement deleted successfully"
      });

      fetchRequirements();
    } catch (error) {
      console.error("Error deleting requirement:", error);
      toast({
        title: "Error",
        description: "Failed to delete requirement",
        variant: "destructive"
      });
    }
  };

  const getRequirementIcon = (type: string) => {
    switch (type) {
      case 'certificate':
        return <FileText className="h-4 w-4" />;
      case 'skill':
        return <Award className="h-4 w-4" />;
      case 'experience':
        return <CheckCircle className="h-4 w-4" />;
      case 'physical':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getRequirementColor = (type: string) => {
    switch (type) {
      case 'certificate':
        return 'bg-blue-100 text-blue-800';
      case 'skill':
        return 'bg-green-100 text-green-800';
      case 'experience':
        return 'bg-purple-100 text-purple-800';
      case 'physical':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading trip requirements...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Trip Requirements</h3>
          <p className="text-sm text-gray-600">Define the requirements for this trip to help match qualified Senseis</p>
        </div>
        <Dialog open={isAddingRequirement} onOpenChange={setIsAddingRequirement}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Requirement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Trip Requirement</DialogTitle>
              <DialogDescription>
                Define a requirement that Senseis need to meet for this trip
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="req-type">Requirement Type *</Label>
                <Select
                  value={requirementForm.requirement_type}
                  onValueChange={(value) => setRequirementForm({...requirementForm, requirement_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {requirementTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="req-name">Requirement Name *</Label>
                <Input
                  id="req-name"
                  value={requirementForm.requirement_name}
                  onChange={(e) => setRequirementForm({...requirementForm, requirement_name: e.target.value})}
                  placeholder="e.g. Diving Certificate, Spanish Language, etc."
                />
              </div>
              <div>
                <Label htmlFor="req-desc">Description</Label>
                <Textarea
                  id="req-desc"
                  value={requirementForm.requirement_description}
                  onChange={(e) => setRequirementForm({...requirementForm, requirement_description: e.target.value})}
                  placeholder="Provide additional details about this requirement..."
                  rows={3}
                />
              </div>
              {requirementForm.requirement_type === 'skill' && (
                <div>
                  <Label htmlFor="min-level">Minimum Level</Label>
                  <Select
                    value={requirementForm.minimum_level}
                    onValueChange={(value) => setRequirementForm({...requirementForm, minimum_level: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select minimum level" />
                    </SelectTrigger>
                    <SelectContent>
                      {minimumLevels.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex items-center justify-between">
                <Label htmlFor="mandatory">Mandatory Requirement</Label>
                <Switch
                  id="mandatory"
                  checked={requirementForm.is_mandatory}
                  onCheckedChange={(checked) => setRequirementForm({...requirementForm, is_mandatory: checked})}
                />
              </div>
              <Button 
                onClick={handleAddRequirement}
                disabled={!requirementForm.requirement_name}
                className="w-full"
              >
                Add Requirement
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {requirements.length === 0 ? (
          <Card>
            <CardContent className="text-center py-6">
              <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">No requirements defined yet</p>
              <p className="text-sm text-gray-400 mt-1">Add requirements to help match qualified Senseis</p>
            </CardContent>
          </Card>
        ) : (
          requirements.map((requirement) => (
            <Card key={requirement.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${getRequirementColor(requirement.requirement_type)}`}>
                      {getRequirementIcon(requirement.requirement_type)}
                    </div>
                    <div>
                      <h4 className="font-semibold">{requirement.requirement_name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getRequirementColor(requirement.requirement_type)}>
                          {requirement.requirement_type}
                        </Badge>
                        {requirement.is_mandatory ? (
                          <Badge variant="destructive">Mandatory</Badge>
                        ) : (
                          <Badge variant="outline">Optional</Badge>
                        )}
                        {requirement.minimum_level && (
                          <Badge variant="outline">
                            Min: {requirement.minimum_level}
                          </Badge>
                        )}
                      </div>
                      {requirement.requirement_description && (
                        <p className="text-sm text-gray-700 mt-2">{requirement.requirement_description}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteRequirement(requirement.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}