import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Badge } from "./badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Textarea } from "./textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SenseiMatchingInsights } from "./sensei-matching-insights";
import { EnhancedSkillVerification } from "./enhanced-skill-verification";
import { 
  FileText, 
  Plus, 
  Upload, 
  Calendar, 
  Building, 
  Award,
  AlertCircle,
  CheckCircle,
  Clock,
  Trash2,
  Eye,
  TrendingUp
} from "lucide-react";

interface Certificate {
  id: string;
  certificate_name: string;
  certificate_type: string;
  issuing_organization?: string;
  certificate_file_url?: string;
  issue_date?: string;
  expiry_date?: string;
  certificate_number?: string;
  verification_status: string;
  verified_by_admin: boolean;
  is_active: boolean;
  created_at: string;
}

interface Skill {
  id: string;
  skill_name: string;
  skill_category: string;
  proficiency_level: string;
  description?: string;
  years_experience?: number;
  is_verified: boolean;
  verified_by_admin: boolean;
  is_active: boolean;
  created_at: string;
}

export function SenseiCertificatesManagement({ senseiId }: { senseiId: string }) {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingCertificate, setIsAddingCertificate] = useState(false);
  const [isAddingSkill, setIsAddingSkill] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const { toast } = useToast();

  // Certificate form state
  const [certificateForm, setCertificateForm] = useState({
    certificate_name: "",
    certificate_type: "",
    issuing_organization: "",
    issue_date: "",
    expiry_date: "",
    certificate_number: "",
    certificate_file: null as File | null
  });

  // Skill form state
  const [skillForm, setSkillForm] = useState({
    skill_name: "",
    skill_category: "",
    proficiency_level: "intermediate",
    description: "",
    years_experience: ""
  });

  const certificateTypes = [
    "diving", "first_aid", "climbing", "rescue", "wilderness_first_aid", 
    "cpr", "water_safety", "mountain_guide", "tour_guide", "language",
    "sailing", "kayaking", "hiking", "medical", "safety", "other"
  ];

  const skillCategories = [
    "language", "technical", "safety", "outdoor", "water_sports", 
    "mountain_sports", "cultural", "medical", "navigation", "survival", "other"
  ];

  const proficiencyLevels = [
    { value: "beginner", label: "Beginner" },
    { value: "intermediate", label: "Intermediate" },
    { value: "advanced", label: "Advanced" },
    { value: "expert", label: "Expert" }
  ];

  useEffect(() => {
    fetchCertificatesAndSkills();
  }, [senseiId]);

  const fetchCertificatesAndSkills = async () => {
    try {
      const [certificatesResponse, skillsResponse] = await Promise.all([
        supabase
          .from("sensei_certificates")
          .select("*")
          .eq("sensei_id", senseiId)
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
        supabase
          .from("sensei_skills")
          .select("*")
          .eq("sensei_id", senseiId)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
      ]);

      if (certificatesResponse.error) throw certificatesResponse.error;
      if (skillsResponse.error) throw skillsResponse.error;

      setCertificates(certificatesResponse.data || []);
      setSkills(skillsResponse.data || []);
    } catch (error) {
      console.error("Error fetching certificates and skills:", error);
      toast({
        title: "Error",
        description: "Failed to load certificates and skills",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadCertificateFile = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${senseiId}-${Date.now()}.${fileExt}`;
    const filePath = `certificates/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('sensei-profiles')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('sensei-profiles')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleAddCertificate = async () => {
    try {
      setUploadingFile(true);
      
      let certificateFileUrl = null;
      if (certificateForm.certificate_file) {
        certificateFileUrl = await uploadCertificateFile(certificateForm.certificate_file);
      }

      const { error } = await supabase
        .from("sensei_certificates")
        .insert({
          sensei_id: senseiId,
          certificate_name: certificateForm.certificate_name,
          certificate_type: certificateForm.certificate_type,
          issuing_organization: certificateForm.issuing_organization || null,
          issue_date: certificateForm.issue_date || null,
          expiry_date: certificateForm.expiry_date || null,
          certificate_number: certificateForm.certificate_number || null,
          certificate_file_url: certificateFileUrl
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Certificate added successfully. It will be reviewed by admin for verification."
      });

      setCertificateForm({
        certificate_name: "",
        certificate_type: "",
        issuing_organization: "",
        issue_date: "",
        expiry_date: "",
        certificate_number: "",
        certificate_file: null
      });
      setIsAddingCertificate(false);
      fetchCertificatesAndSkills();
    } catch (error) {
      console.error("Error adding certificate:", error);
      toast({
        title: "Error",
        description: "Failed to add certificate",
        variant: "destructive"
      });
    } finally {
      setUploadingFile(false);
    }
  };

  const handleAddSkill = async () => {
    try {
      const { error } = await supabase
        .from("sensei_skills")
        .insert({
          sensei_id: senseiId,
          skill_name: skillForm.skill_name,
          skill_category: skillForm.skill_category,
          proficiency_level: skillForm.proficiency_level,
          description: skillForm.description || null,
          years_experience: skillForm.years_experience ? parseInt(skillForm.years_experience) : null
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Skill added successfully"
      });

      setSkillForm({
        skill_name: "",
        skill_category: "",
        proficiency_level: "intermediate",
        description: "",
        years_experience: ""
      });
      setIsAddingSkill(false);
      fetchCertificatesAndSkills();
    } catch (error) {
      console.error("Error adding skill:", error);
      toast({
        title: "Error",
        description: "Failed to add skill",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'expired':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'rejected':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading certificates and skills...</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="certificates" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="certificates">Certificates</TabsTrigger>
          <TabsTrigger value="skills">Skills & Knowledge</TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Trip Matching
          </TabsTrigger>
        </TabsList>

        <TabsContent value="certificates" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">My Certificates</h3>
            <Dialog open={isAddingCertificate} onOpenChange={setIsAddingCertificate}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Certificate
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Certificate</DialogTitle>
                  <DialogDescription>
                    Upload your certificate and provide details for verification
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="cert-name">Certificate Name *</Label>
                    <Input
                      id="cert-name"
                      value={certificateForm.certificate_name}
                      onChange={(e) => setCertificateForm({...certificateForm, certificate_name: e.target.value})}
                      placeholder="e.g. PADI Open Water Diver"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cert-type">Certificate Type *</Label>
                    <Select
                      value={certificateForm.certificate_type}
                      onValueChange={(value) => setCertificateForm({...certificateForm, certificate_type: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select certificate type" />
                      </SelectTrigger>
                      <SelectContent>
                        {certificateTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type.replace(/_/g, ' ').toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="issuing-org">Issuing Organization</Label>
                    <Input
                      id="issuing-org"
                      value={certificateForm.issuing_organization}
                      onChange={(e) => setCertificateForm({...certificateForm, issuing_organization: e.target.value})}
                      placeholder="e.g. PADI, Red Cross, etc."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="issue-date">Issue Date</Label>
                      <Input
                        id="issue-date"
                        type="date"
                        value={certificateForm.issue_date}
                        onChange={(e) => setCertificateForm({...certificateForm, issue_date: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="expiry-date">Expiry Date</Label>
                      <Input
                        id="expiry-date"
                        type="date"
                        value={certificateForm.expiry_date}
                        onChange={(e) => setCertificateForm({...certificateForm, expiry_date: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="cert-number">Certificate Number</Label>
                    <Input
                      id="cert-number"
                      value={certificateForm.certificate_number}
                      onChange={(e) => setCertificateForm({...certificateForm, certificate_number: e.target.value})}
                      placeholder="Certificate ID/Number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cert-file">Upload Certificate File</Label>
                    <Input
                      id="cert-file"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setCertificateForm({...certificateForm, certificate_file: e.target.files?.[0] || null})}
                    />
                  </div>
                  <Button 
                    onClick={handleAddCertificate}
                    disabled={!certificateForm.certificate_name || !certificateForm.certificate_type || uploadingFile}
                    className="w-full"
                  >
                    {uploadingFile ? "Uploading..." : "Add Certificate"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {certificates.length === 0 ? (
              <Card>
                <CardContent className="text-center py-6">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No certificates added yet</p>
                </CardContent>
              </Card>
            ) : (
              certificates.map((cert) => (
                <Card key={cert.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold">{cert.certificate_name}</h4>
                        <p className="text-sm text-gray-600">{cert.certificate_type.replace(/_/g, ' ').toUpperCase()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(cert.verification_status)}
                        <Badge className={getStatusColor(cert.verification_status)}>
                          {cert.verification_status}
                        </Badge>
                      </div>
                    </div>
                    {cert.issuing_organization && (
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {cert.issuing_organization}
                      </p>
                    )}
                    {cert.expiry_date && (
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Expires: {new Date(cert.expiry_date).toLocaleDateString()}
                      </p>
                    )}
                    {cert.certificate_file_url && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={() => window.open(cert.certificate_file_url, '_blank')}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Certificate
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="skills" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">My Skills & Knowledge</h3>
            <Dialog open={isAddingSkill} onOpenChange={setIsAddingSkill}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Skill
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Skill</DialogTitle>
                  <DialogDescription>
                    Add your skills and knowledge areas
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="skill-name">Skill Name *</Label>
                    <Input
                      id="skill-name"
                      value={skillForm.skill_name}
                      onChange={(e) => setSkillForm({...skillForm, skill_name: e.target.value})}
                      placeholder="e.g. Spanish Language, Rock Climbing"
                    />
                  </div>
                  <div>
                    <Label htmlFor="skill-category">Category *</Label>
                    <Select
                      value={skillForm.skill_category}
                      onValueChange={(value) => setSkillForm({...skillForm, skill_category: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {skillCategories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category.replace(/_/g, ' ').toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="proficiency">Proficiency Level *</Label>
                    <Select
                      value={skillForm.proficiency_level}
                      onValueChange={(value) => setSkillForm({...skillForm, proficiency_level: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {proficiencyLevels.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            {level.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="years-exp">Years of Experience</Label>
                    <Input
                      id="years-exp"
                      type="number"
                      value={skillForm.years_experience}
                      onChange={(e) => setSkillForm({...skillForm, years_experience: e.target.value})}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="skill-desc">Description</Label>
                    <Textarea
                      id="skill-desc"
                      value={skillForm.description}
                      onChange={(e) => setSkillForm({...skillForm, description: e.target.value})}
                      placeholder="Describe your skill and experience..."
                      rows={3}
                    />
                  </div>
                  <Button 
                    onClick={handleAddSkill}
                    disabled={!skillForm.skill_name || !skillForm.skill_category}
                    className="w-full"
                  >
                    Add Skill
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {skills.length === 0 ? (
              <Card>
                <CardContent className="text-center py-6">
                  <Award className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No skills added yet</p>
                </CardContent>
              </Card>
            ) : (
              skills.map((skill) => (
                <EnhancedSkillVerification
                  key={skill.id}
                  skill={skill}
                  senseiId={senseiId}
                  onVerificationSubmitted={fetchCertificatesAndSkills}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <SenseiMatchingInsights senseiId={senseiId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}