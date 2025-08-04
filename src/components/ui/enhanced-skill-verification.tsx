import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./dialog";
import { Button } from "./button";
import { Badge } from "./badge";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { Label } from "./label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { CheckCircle, XCircle, Clock, Upload, FileText, Users, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { handleError } from "@/lib/error-handler";

interface Skill {
  id: string;
  skill_name: string;
  skill_category: string;
  proficiency_level: string;
  is_verified: boolean;
  verification_status?: string;
}

interface VerificationRequest {
  id: string;
  verification_type: string;
  evidence_url?: string;
  evidence_description?: string;
  status: string;
  created_at: string;
}

interface EnhancedSkillVerificationProps {
  skill: Skill;
  senseiId: string;
  onVerificationSubmitted: () => void;
}

export function EnhancedSkillVerification({ 
  skill, 
  senseiId, 
  onVerificationSubmitted 
}: EnhancedSkillVerificationProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verificationType, setVerificationType] = useState<string>('admin');
  const [evidenceDescription, setEvidenceDescription] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFileUpload = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${senseiId}/${skill.id}/${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('sensei-profiles')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('sensei-profiles')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      handleError(error, {
        component: 'EnhancedSkillVerification',
        action: 'uploadFile'
      }, false);
      return null;
    }
  };

  const submitVerificationRequest = async () => {
    setLoading(true);
    try {
      let evidenceUrl = null;
      
      if (evidenceFile) {
        evidenceUrl = await handleFileUpload(evidenceFile);
        if (!evidenceUrl) {
          throw new Error('Failed to upload evidence file');
        }
      }

      const { error } = await supabase
        .from('skill_verification_requests')
        .insert({
          sensei_id: senseiId,
          skill_id: skill.id,
          verification_type: verificationType,
          evidence_url: evidenceUrl,
          evidence_description: evidenceDescription,
        });

      if (error) throw error;

      toast({
        title: "Verification Request Submitted",
        description: "Your skill verification request has been submitted for review.",
      });

      setOpen(false);
      onVerificationSubmitted();
      
      // Reset form
      setVerificationType('admin');
      setEvidenceDescription('');
      setEvidenceFile(null);
    } catch (error) {
      handleError(error, {
        component: 'EnhancedSkillVerification',
        action: 'submitRequest'
      }, true, "Failed to submit verification request");
    } finally {
      setLoading(false);
    }
  };

  const getVerificationIcon = () => {
    if (skill.is_verified) {
      return <CheckCircle className="h-4 w-4 text-emerald-500" />;
    }
    return <Clock className="h-4 w-4 text-amber-500" />;
  };

  const getVerificationBadge = () => {
    if (skill.is_verified) {
      return (
        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
          <CheckCircle className="h-3 w-3 mr-1" />
          Verified
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-amber-100 text-amber-700">
        <Clock className="h-3 w-3 mr-1" />
        Unverified
      </Badge>
    );
  };

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              {skill.skill_name}
              {getVerificationIcon()}
            </CardTitle>
            <CardDescription className="text-sm">
              {skill.skill_category} • {skill.proficiency_level}
            </CardDescription>
          </div>
          {getVerificationBadge()}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {!skill.is_verified && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                <Shield className="h-4 w-4 mr-2" />
                Request Verification
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Request Skill Verification</DialogTitle>
                <DialogDescription>
                  Submit evidence to verify your "{skill.skill_name}" skill
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="verification-type">Verification Method</Label>
                  <Select value={verificationType} onValueChange={setVerificationType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select verification method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Admin Review
                        </div>
                      </SelectItem>
                      <SelectItem value="portfolio">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Portfolio Evidence
                        </div>
                      </SelectItem>
                      <SelectItem value="peer">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Peer Endorsement
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="evidence-description">Evidence Description</Label>
                  <Textarea
                    id="evidence-description"
                    placeholder="Describe your experience and evidence for this skill..."
                    value={evidenceDescription}
                    onChange={(e) => setEvidenceDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="evidence-file">Supporting Documentation (Optional)</Label>
                  <Input
                    id="evidence-file"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload certificates, portfolio items, or other evidence (Max 10MB)
                  </p>
                </div>

                {verificationType === 'admin' && (
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <Shield className="h-4 w-4 inline mr-1" />
                      Admin verification typically takes 2-3 business days
                    </p>
                  </div>
                )}

                {verificationType === 'portfolio' && (
                  <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                    <p className="text-sm text-purple-800">
                      <FileText className="h-4 w-4 inline mr-1" />
                      Portfolio evidence will be reviewed for quality and relevance
                    </p>
                  </div>
                )}

                {verificationType === 'peer' && (
                  <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                    <p className="text-sm text-green-800">
                      <Users className="h-4 w-4 inline mr-1" />
                      Peer endorsements require confirmation from verified senseis
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={submitVerificationRequest}
                  disabled={loading || !evidenceDescription.trim()}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Upload className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Submit Request
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}