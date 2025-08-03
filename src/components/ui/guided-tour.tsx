import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Navigation, 
  ArrowRight, 
  ArrowLeft, 
  X, 
  Play, 
  RotateCcw,
  CheckCircle,
  Circle,
  MapPin,
  Lightbulb,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocation } from 'react-router-dom';

interface TourStep {
  id: string;
  title: string;
  description: string;
  target: string; // CSS selector
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  content: string;
  optional?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface TourConfig {
  id: string;
  name: string;
  description: string;
  route: string;
  steps: TourStep[];
}

interface GuidedTourProps {
  tourId?: string;
  autoStart?: boolean;
  onComplete?: () => void;
  onSkip?: () => void;
}

export const GuidedTour: React.FC<GuidedTourProps> = ({ 
  tourId,
  autoStart = false,
  onComplete,
  onSkip
}) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentTour, setCurrentTour] = useState<TourConfig | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [availableTours, setAvailableTours] = useState<TourConfig[]>([]);
  const location = useLocation();

  // Tour configurations
  const tours: TourConfig[] = [
    {
      id: 'dashboard-basics',
      name: 'Dashboard Basics',
      description: 'Learn to navigate your dashboard',
      route: '/dashboard',
      steps: [
        {
          id: 'welcome',
          title: 'Welcome to Your Dashboard',
          description: 'Your central hub for managing trips',
          target: 'body',
          position: 'center',
          content: 'This is your personal dashboard where you can view upcoming trips, messages, and account information.'
        },
        {
          id: 'sidebar',
          title: 'Navigation Sidebar',
          description: 'Access all platform features',
          target: '[data-tour="sidebar"]',
          position: 'right',
          content: 'Use the sidebar to navigate between trips, messages, profile settings, and more.'
        },
        {
          id: 'trip-cards',
          title: 'Your Trips',
          description: 'View and manage your bookings',
          target: '[data-tour="trip-cards"]',
          position: 'top',
          content: 'Here you can see all your upcoming and past trips. Click on any trip for detailed information.'
        },
        {
          id: 'notifications',
          title: 'Stay Updated',
          description: 'Important alerts and messages',
          target: '[data-tour="notifications"]',
          position: 'bottom',
          content: 'Check notifications for trip updates, messages from senseis, and important announcements.'
        }
      ]
    },
    {
      id: 'booking-process',
      name: 'How to Book a Trip',
      description: 'Step-by-step booking guide',
      route: '/explore',
      steps: [
        {
          id: 'search',
          title: 'Find Your Perfect Trip',
          description: 'Browse available experiences',
          target: '[data-tour="search"]',
          position: 'bottom',
          content: 'Use filters to find trips that match your interests, budget, and schedule.'
        },
        {
          id: 'trip-details',
          title: 'Trip Information',
          description: 'Review all trip details',
          target: '[data-tour="trip-card"]',
          position: 'left',
          content: 'Each trip card shows the destination, sensei, price, and key highlights.'
        },
        {
          id: 'sensei-profile',
          title: 'Meet Your Sensei',
          description: 'Learn about your guide',
          target: '[data-tour="sensei-info"]',
          position: 'right',
          content: 'View your sensei\'s background, expertise, and reviews from previous travelers.'
        },
        {
          id: 'booking-button',
          title: 'Complete Your Booking',
          description: 'Reserve your spot',
          target: '[data-tour="book-button"]',
          position: 'top',
          content: 'Click to start the booking process. You\'ll be guided through payment options and trip customization.',
          action: {
            label: 'Try Booking',
            onClick: () => console.log('Demo booking initiated')
          }
        }
      ]
    },
    {
      id: 'admin-overview',
      name: 'Admin Platform Tour',
      description: 'Master the admin interface',
      route: '/admin',
      steps: [
        {
          id: 'analytics',
          title: 'Platform Analytics',
          description: 'Monitor key metrics',
          target: '[data-tour="analytics"]',
          position: 'bottom',
          content: 'Track bookings, revenue, user activity, and platform performance in real-time.'
        },
        {
          id: 'trip-management',
          title: 'Trip Management',
          description: 'Oversee all trips',
          target: '[data-tour="trips"]',
          position: 'left',
          content: 'View all trips, manage cancellations, and handle customer support issues.'
        },
        {
          id: 'sensei-management',
          title: 'Sensei Oversight',
          description: 'Manage your sensei network',
          target: '[data-tour="senseis"]',
          position: 'right',
          content: 'Review sensei applications, manage profiles, and monitor performance metrics.'
        }
      ]
    }
  ];

  useEffect(() => {
    // Filter tours relevant to current route
    const relevantTours = tours.filter(tour => 
      location.pathname.includes(tour.route.split('/')[1])
    );
    setAvailableTours(relevantTours);

    // Auto-start tour if specified
    if (autoStart && relevantTours.length > 0) {
      startTour(tourId || relevantTours[0].id);
    }
  }, [location.pathname, tourId, autoStart]);

  const startTour = (selectedTourId: string) => {
    const tour = tours.find(t => t.id === selectedTourId);
    if (tour) {
      setCurrentTour(tour);
      setCurrentStep(0);
      setIsActive(true);
      setCompletedSteps(new Set());
    }
  };

  const nextStep = () => {
    if (currentTour && currentStep < currentTour.steps.length - 1) {
      const currentStepId = currentTour.steps[currentStep].id;
      setCompletedSteps(prev => new Set([...prev, currentStepId]));
      setCurrentStep(prev => prev + 1);
    } else {
      completeTour();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const skipTour = () => {
    setIsActive(false);
    setCurrentTour(null);
    setCurrentStep(0);
    onSkip?.();
  };

  const completeTour = () => {
    if (currentTour) {
      const currentStepId = currentTour.steps[currentStep].id;
      setCompletedSteps(prev => new Set([...prev, currentStepId]));
    }
    setIsActive(false);
    setCurrentTour(null);
    setCurrentStep(0);
    onComplete?.();
  };

  const restartTour = () => {
    setCurrentStep(0);
    setCompletedSteps(new Set());
  };

  if (!isActive || !currentTour) {
    // Tour selector when not active
    if (availableTours.length > 0) {
      return (
        <Card className="fixed bottom-4 right-4 z-50 w-80 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Navigation className="h-4 w-4" />
              Guided Tours
            </CardTitle>
            <CardDescription>
              Learn how to use this page effectively
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {availableTours.map((tour) => (
              <div 
                key={tour.id}
                className="border rounded-lg p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => startTour(tour.id)}
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium text-sm">{tour.name}</h4>
                  <Badge variant="outline" className="text-xs">
                    {tour.steps.length} steps
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{tour.description}</p>
                <Button size="sm" variant="outline" className="w-full text-xs">
                  <Play className="h-3 w-3 mr-1" />
                  Start Tour
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      );
    }
    return null;
  }

  const currentStepData = currentTour.steps[currentStep];
  const progress = ((currentStep + 1) / currentTour.steps.length) * 100;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-40" />
      
      {/* Tour Modal */}
      <Card className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-96 max-w-[90vw] shadow-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <div>
                <CardTitle className="text-base">{currentStepData.title}</CardTitle>
                <CardDescription className="text-xs">{currentStepData.description}</CardDescription>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6"
              onClick={skipTour}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Step {currentStep + 1} of {currentTour.steps.length}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-1" />
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm">{currentStepData.content}</p>
            </div>
          </div>
          
          {currentStepData.action && (
            <Button 
              size="sm" 
              variant="outline" 
              className="w-full"
              onClick={currentStepData.action.onClick}
            >
              {currentStepData.action.label}
            </Button>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {currentTour.steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  {completedSteps.has(step.id) ? (
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  ) : index === currentStep ? (
                    <Circle className="h-3 w-3 text-primary fill-current" />
                  ) : (
                    <Circle className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>
            
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={restartTour}
                className="text-xs"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Restart
              </Button>
              
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  className="text-xs"
                >
                  <ArrowLeft className="h-3 w-3" />
                </Button>
                
                <Button
                  size="sm"
                  onClick={nextStep}
                  className="text-xs"
                >
                  {currentStep === currentTour.steps.length - 1 ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Finish
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};