import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle, User, Phone, AlertTriangle, Heart, FileText, Camera } from "lucide-react";
import { Link } from "react-router-dom";

interface ProfileField {
  key: string;
  label: string;
  icon: React.ElementType;
  required: boolean;
  category: 'basic' | 'safety' | 'health' | 'documents';
}

interface ProfileCompletionIndicatorProps {
  profile: any;
  documents?: any[];
  className?: string;
}

const profileFields: ProfileField[] = [
  { key: 'full_name', label: 'Full Name', icon: User, required: true, category: 'basic' },
  { key: 'phone', label: 'Phone Number', icon: Phone, required: false, category: 'basic' },
  { key: 'emergency_contact_name', label: 'Emergency Contact Name', icon: AlertTriangle, required: true, category: 'safety' },
  { key: 'emergency_contact_phone', label: 'Emergency Contact Phone', icon: AlertTriangle, required: true, category: 'safety' },
  { key: 'dietary_restrictions', label: 'Dietary Restrictions', icon: Heart, required: false, category: 'health' },
  { key: 'medical_conditions', label: 'Medical Conditions', icon: Heart, required: false, category: 'health' },
];

export function ProfileCompletionIndicator({ profile, documents = [], className }: ProfileCompletionIndicatorProps) {
  const calculateCompletion = () => {
    if (!profile) return { percentage: 0, completed: 0, total: 0, requiredCompleted: 0, requiredTotal: 0 };

    let completed = 0;
    let requiredCompleted = 0;
    const requiredTotal = profileFields.filter(field => field.required).length;
    const total = profileFields.length;

    profileFields.forEach(field => {
      const value = profile[field.key];
      const isCompleted = value && value.trim() !== '';
      
      if (isCompleted) {
        completed++;
        if (field.required) {
          requiredCompleted++;
        }
      }
    });

    // Add document completion
    const hasDocuments = documents.length > 0;
    if (hasDocuments) {
      completed++;
    }
    
    const adjustedTotal = total + 1; // Including documents
    const percentage = Math.round((completed / adjustedTotal) * 100);

    return { 
      percentage, 
      completed, 
      total: adjustedTotal, 
      requiredCompleted, 
      requiredTotal,
      hasDocuments 
    };
  };

  const groupFieldsByCategory = () => {
    const grouped = profileFields.reduce((acc, field) => {
      if (!acc[field.category]) {
        acc[field.category] = [];
      }
      acc[field.category].push(field);
      return acc;
    }, {} as Record<string, ProfileField[]>);

    return grouped;
  };

  const getCompletionLevel = (percentage: number) => {
    if (percentage >= 90) return { level: 'Excellent', color: 'bg-green-500', textColor: 'text-green-700' };
    if (percentage >= 70) return { level: 'Good', color: 'bg-blue-500', textColor: 'text-blue-700' };
    if (percentage >= 50) return { level: 'Fair', color: 'bg-yellow-500', textColor: 'text-yellow-700' };
    return { level: 'Needs Attention', color: 'bg-red-500', textColor: 'text-red-700' };
  };

  const completion = calculateCompletion();
  const completionLevel = getCompletionLevel(completion.percentage);
  const groupedFields = groupFieldsByCategory();

  const categoryLabels = {
    basic: 'Basic Information',
    safety: 'Safety Information',
    health: 'Health Information',
    documents: 'Travel Documents'
  };

  const renderFieldStatus = (field: ProfileField) => {
    const value = profile?.[field.key];
    const isCompleted = value && value.trim() !== '';
    
    return (
      <div key={field.key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-2 flex-1">
          {isCompleted ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <Circle className="h-4 w-4 text-muted-foreground" />
          )}
          <field.icon className="h-4 w-4 text-muted-foreground" />
          <span className={`text-sm ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
            {field.label}
          </span>
        </div>
        <div className="flex gap-1">
          {field.required && (
            <Badge variant="secondary" className="text-xs">Required</Badge>
          )}
          {isCompleted && (
            <Badge variant="default" className="text-xs">Complete</Badge>
          )}
        </div>
      </div>
    );
  };

  if (!profile) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Setup Required
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Complete your profile to get personalized trip recommendations and ensure your safety during adventures.
          </p>
          <Button asChild>
            <Link to="/customer/profile">Set Up Profile</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Completion
          </CardTitle>
          <Badge variant="outline" className={completionLevel.textColor}>
            {completionLevel.level}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Overview */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-muted-foreground">
              {completion.completed} of {completion.total} completed
            </span>
          </div>
          <Progress value={completion.percentage} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Required: {completion.requiredCompleted}/{completion.requiredTotal}</span>
            <span>{completion.percentage}% Complete</span>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="space-y-4">
          {Object.entries(groupedFields).map(([category, fields]) => (
            <div key={category} className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                {categoryLabels[category as keyof typeof categoryLabels]}
              </h4>
              <div className="space-y-1">
                {fields.map(renderFieldStatus)}
              </div>
            </div>
          ))}
          
          {/* Documents Section */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Travel Documents</h4>
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2 flex-1">
                {completion.hasDocuments ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className={`text-sm ${completion.hasDocuments ? 'text-foreground' : 'text-muted-foreground'}`}>
                  Travel Documents ({documents.length} uploaded)
                </span>
              </div>
              {completion.hasDocuments && (
                <Badge variant="default" className="text-xs">Complete</Badge>
              )}
            </div>
          </div>
        </div>

        {completion.percentage < 100 && (
          <div className="pt-4 border-t">
            <Button asChild className="w-full">
              <Link to="/customer/profile">Complete Profile</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}