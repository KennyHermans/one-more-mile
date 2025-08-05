import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, User, Phone, AlertTriangle, Heart, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface OnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onComplete: () => void;
}

interface OnboardingData {
  full_name: string;
  phone: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  dietary_restrictions: string;
  medical_conditions: string;
}

export function OnboardingWizard({ isOpen, onClose, userId, onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const [data, setData] = useState<OnboardingData>({
    full_name: '',
    phone: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    dietary_restrictions: '',
    medical_conditions: ''
  });

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  const steps = [
    {
      id: 1,
      title: "Welcome to One More Mile!",
      description: "Let's set up your profile to personalize your adventure experience",
      icon: Sparkles
    },
    {
      id: 2,
      title: "Personal Information",
      description: "Tell us about yourself",
      icon: User
    },
    {
      id: 3,
      title: "Emergency Contact",
      description: "Safety first - who should we contact in case of emergency?",
      icon: AlertTriangle
    },
    {
      id: 4,
      title: "Health & Preferences",
      description: "Help us make your trip comfortable and safe",
      icon: Heart
    }
  ];

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 2:
        return data.full_name.trim() !== '';
      case 3:
        return data.emergency_contact_name.trim() !== '' && data.emergency_contact_phone.trim() !== '';
      case 4:
        return true; // Optional fields
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    } else {
      toast({
        title: "Required fields missing",
        description: "Please fill in all required fields before continuing",
        variant: "destructive",
      });
    }
  };

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const profileData = {
        user_id: userId,
        ...data
      };

      const { error } = await supabase
        .from('customer_profiles')
        .insert([profileData]);

      if (error) throw error;

      // Create initial todos for the user
      const initialTodos = [
        {
          user_id: userId,
          title: "Complete your first trip booking",
          description: "Browse our adventure trips and book one that interests you",
          created_by_admin: true
        },
        {
          user_id: userId,
          title: "Upload travel documents",
          description: "Upload your passport and any required travel documents",
          created_by_admin: true
        },
        {
          user_id: userId,
          title: "Review your emergency contacts",
          description: "Make sure your emergency contact information is up to date",
          created_by_admin: true
        }
      ];

      await supabase
        .from('customer_todos')
        .insert(initialTodos);

      toast({
        title: "Welcome aboard! 🎉",
        description: "Your profile has been created successfully. Ready for your first adventure?",
      });

      onComplete();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="text-center space-y-6 py-8">
            <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Sparkles className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-2">Ready for Adventure?</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                We're excited to have you join our community of adventurers! Let's take a few minutes to set up your profile so we can provide you with the best possible experience.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              <Badge variant="secondary">Personalized Recommendations</Badge>
              <Badge variant="secondary">Safety First</Badge>
              <Badge variant="secondary">Expert Guides</Badge>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                value={data.full_name}
                onChange={(e) => setData({ ...data, full_name: e.target.value })}
                placeholder="Enter your full name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Number
              </Label>
              <Input
                id="phone"
                value={data.phone}
                onChange={(e) => setData({ ...data, phone: e.target.value })}
                placeholder="Enter your phone number"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <h4 className="font-semibold text-orange-800">Safety First</h4>
              </div>
              <p className="text-sm text-orange-700">
                We require emergency contact information for all travelers. This ensures we can reach someone if needed during your adventure.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emergency_contact_name">Emergency Contact Name *</Label>
                <Input
                  id="emergency_contact_name"
                  value={data.emergency_contact_name}
                  onChange={(e) => setData({ ...data, emergency_contact_name: e.target.value })}
                  placeholder="Full name of emergency contact"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergency_contact_phone">Emergency Contact Phone *</Label>
                <Input
                  id="emergency_contact_phone"
                  value={data.emergency_contact_phone}
                  onChange={(e) => setData({ ...data, emergency_contact_phone: e.target.value })}
                  placeholder="Phone number of emergency contact"
                  required
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="h-5 w-5 text-blue-600" />
                <h4 className="font-semibold text-blue-800">Your Comfort Matters</h4>
              </div>
              <p className="text-sm text-blue-700">
                Help us ensure your adventure is safe and enjoyable by sharing any dietary restrictions or medical conditions we should know about.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dietary_restrictions">Dietary Restrictions</Label>
                <Textarea
                  id="dietary_restrictions"
                  value={data.dietary_restrictions}
                  onChange={(e) => setData({ ...data, dietary_restrictions: e.target.value })}
                  placeholder="Any dietary restrictions, allergies, or preferences..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="medical_conditions">Medical Conditions</Label>
                <Textarea
                  id="medical_conditions"
                  value={data.medical_conditions}
                  onChange={(e) => setData({ ...data, medical_conditions: e.target.value })}
                  placeholder="Any medical conditions your guide should be aware of..."
                  rows={3}
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                {React.createElement(steps[currentStep - 1].icon, { className: "h-5 w-5" })}
                {steps[currentStep - 1].title}
              </DialogTitle>
              <DialogDescription>
                {steps[currentStep - 1].description}
              </DialogDescription>
            </div>
            <Badge variant="outline">
              Step {currentStep} of {totalSteps}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="min-h-[300px]">
            {renderStepContent()}
          </div>

          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>

            {currentStep < totalSteps ? (
              <Button
                onClick={handleNext}
                disabled={!validateStep(currentStep)}
                className="flex items-center gap-2"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={loading}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <>Creating Profile...</>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Complete Setup
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}