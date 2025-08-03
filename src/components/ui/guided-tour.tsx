import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowRight, ArrowLeft, MapPin, Bell, Megaphone, MessageCircle, Star, User, Calendar, CheckSquare, FileText, X, Lightbulb, Navigation } from "lucide-react";

interface TourStep {
  id: string;
  title: string;
  description: string;
  target: string;
  icon: React.ElementType;
  position: 'top' | 'bottom' | 'left' | 'right';
  spotlight?: boolean;
}

interface GuidedTourProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Your Dashboard!',
    description: 'This is your central hub for managing all your adventure travel needs. Let\'s take a quick tour!',
    target: 'dashboard-title',
    icon: Navigation,
    position: 'bottom'
  },
  {
    id: 'trips_tab',
    title: 'Your Trips',
    description: 'View and manage all your booked adventures. See trip details, payment status, and timeline visualization.',
    target: 'trips-tab',
    icon: MapPin,
    position: 'bottom',
    spotlight: true
  },
  {
    id: 'notifications_tab',
    title: 'Smart Notifications',
    description: 'Stay updated with personalized notifications about your trips, deadlines, and important updates.',
    target: 'notifications-tab',
    icon: Bell,
    position: 'bottom',
    spotlight: true
  },
  {
    id: 'news_tab',
    title: 'News & Announcements',
    description: 'Get the latest news from your guides and important announcements about your trips.',
    target: 'news-tab',
    icon: Megaphone,
    position: 'bottom',
    spotlight: true
  },
  {
    id: 'messages_tab',
    title: 'Trip Messages',
    description: 'Communicate with your guides and fellow travelers. Share experiences and ask questions.',
    target: 'messages-tab',
    icon: MessageCircle,
    position: 'bottom',
    spotlight: true
  },
  {
    id: 'reviews_tab',
    title: 'Reviews & Feedback',
    description: 'Share your experiences and read reviews from other adventurers to plan future trips.',
    target: 'reviews-tab',
    icon: Star,
    position: 'bottom',
    spotlight: true
  },
  {
    id: 'profile_tab',
    title: 'Your Profile',
    description: 'Manage your personal information, emergency contacts, and travel preferences.',
    target: 'profile-tab',
    icon: User,
    position: 'bottom',
    spotlight: true
  },
  {
    id: 'calendar_tab',
    title: 'Trip Calendar',
    description: 'View your trips in a calendar format to better plan your adventures.',
    target: 'calendar-tab',
    icon: Calendar,
    position: 'bottom',
    spotlight: true
  },
  {
    id: 'todos_tab',
    title: 'To-Do List',
    description: 'Keep track of important tasks and deadlines for your trips.',
    target: 'todos-tab',
    icon: CheckSquare,
    position: 'bottom',
    spotlight: true
  },
  {
    id: 'documents_tab',
    title: 'Travel Documents',
    description: 'Upload and manage your travel documents, passports, and important files.',
    target: 'documents-tab',
    icon: FileText,
    position: 'bottom',
    spotlight: true
  }
];

export function GuidedTour({ isOpen, onClose, onComplete }: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);

  const currentTourStep = tourSteps[currentStep];
  const isLastStep = currentStep === tourSteps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('dashboard_tour_completed', 'true');
    onComplete();
    onClose();
  };

  const handleSkip = () => {
    localStorage.setItem('dashboard_tour_completed', 'true');
    onClose();
  };

  useEffect(() => {
    if (isOpen && currentTourStep?.target) {
      // Scroll to the target element
      const element = document.querySelector(`[data-tour-target="${currentTourStep.target}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Add highlight effect
        element.classList.add('tour-highlight');
        setTimeout(() => {
          element.classList.remove('tour-highlight');
        }, 2000);
      }
    }
  }, [currentStep, isOpen, currentTourStep]);

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Card className="w-80 shadow-lg border-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Tour in Progress</span>
                <Badge variant="outline" className="text-xs">
                  {currentStep + 1}/{tourSteps.length}
                </Badge>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsMinimized(false)}
              >
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-40" />
      
      {/* Tour Dialog */}
      <div className="fixed bottom-4 right-4 z-50">
        <Card className="w-96 shadow-xl border-primary">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <currentTourStep.icon className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">{currentTourStep.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsMinimized(true)}
                  title="Minimize tour"
                >
                  -
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleSkip}
                  title="Close tour"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              {currentTourStep.description}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  Step {currentStep + 1} of {tourSteps.length}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {Math.round(((currentStep + 1) / tourSteps.length) * 100)}% Complete
                </span>
              </div>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                  className="flex items-center gap-1"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back
                </Button>
                
                {isLastStep ? (
                  <Button
                    size="sm"
                    onClick={handleComplete}
                    className="flex items-center gap-1"
                  >
                    Finish Tour
                    <CheckSquare className="h-3 w-3" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleNext}
                    className="flex items-center gap-1"
                  >
                    Next
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Progress indicator */}
            <div className="mt-4 flex gap-1">
              {tourSteps.map((_, index) => (
                <div
                  key={index}
                  className={`h-1 flex-1 rounded ${
                    index <= currentStep ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
            
            <div className="mt-3 text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="text-xs text-muted-foreground"
              >
                Skip Tour
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// Helper function to check if tour should be shown
export function shouldShowTour(): boolean {
  return !localStorage.getItem('dashboard_tour_completed');
}

// Helper function to reset tour (for testing or user request)
export function resetTour(): void {
  localStorage.removeItem('dashboard_tour_completed');
}