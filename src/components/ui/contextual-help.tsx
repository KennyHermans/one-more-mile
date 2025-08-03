import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  HelpCircle, 
  Lightbulb, 
  BookOpen, 
  Video, 
  MessageCircle,
  X,
  ChevronRight,
  Sparkles,
  Clock,
  Star
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface HelpItem {
  id: string;
  title: string;
  description: string;
  type: 'tip' | 'guide' | 'video' | 'faq';
  relevance: number;
  route: string;
  content: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

interface ContextualHelpProps {
  className?: string;
  position?: 'fixed' | 'relative';
}

export const ContextualHelp: React.FC<ContextualHelpProps> = ({ 
  className,
  position = 'fixed'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentHelp, setCurrentHelp] = useState<HelpItem[]>([]);
  const [hasSeenHelp, setHasSeenHelp] = useState(false);
  const location = useLocation();

  const helpDatabase: HelpItem[] = [
    {
      id: 'dashboard-overview',
      title: 'Dashboard Overview',
      description: 'Learn how to navigate your dashboard effectively',
      type: 'guide',
      relevance: 95,
      route: '/dashboard',
      content: 'Your dashboard shows your trips, notifications, and quick actions. Use the sidebar to navigate between different sections.',
      action: {
        label: 'Take Tour',
        onClick: () => console.log('Starting dashboard tour')
      }
    },
    {
      id: 'booking-process',
      title: 'How to Book a Trip',
      description: 'Step-by-step guide to booking your perfect trip',
      type: 'video',
      relevance: 90,
      route: '/explore',
      content: 'Browse trips, check sensei availability, and complete your booking in just a few clicks.',
      action: {
        label: 'Watch Video',
        href: '/help/booking-video'
      }
    },
    {
      id: 'sensei-matching',
      title: 'Sensei Matching',
      description: 'Understanding how we match you with the perfect sensei',
      type: 'tip',
      relevance: 85,
      route: '/senseis',
      content: 'Our AI considers your interests, experience level, and preferred learning style to find the ideal sensei.',
    },
    {
      id: 'payment-plans',
      title: 'Payment Options',
      description: 'Flexible payment plans available',
      type: 'faq',
      relevance: 80,
      route: '/trip',
      content: 'We offer full payment, 50/50 split, and monthly installment options for trips over $500.',
    },
    {
      id: 'admin-analytics',
      title: 'Analytics Dashboard',
      description: 'Understanding your platform metrics',
      type: 'guide',
      relevance: 92,
      route: '/admin',
      content: 'Monitor bookings, revenue, sensei performance, and customer satisfaction metrics in real-time.',
      action: {
        label: 'View Examples',
        onClick: () => console.log('Showing analytics examples')
      }
    },
    {
      id: 'sensei-profile',
      title: 'Optimizing Your Profile',
      description: 'Tips to attract more bookings',
      type: 'tip',
      relevance: 88,
      route: '/sensei',
      content: 'Complete your profile, add high-quality photos, and highlight your unique expertise to stand out.',
    }
  ];

  useEffect(() => {
    const getContextualHelp = () => {
      const currentRoute = location.pathname;
      
      // Find relevant help items for current route
      const relevantHelp = helpDatabase
        .filter(item => currentRoute.includes(item.route.split('/')[1]) || item.route === '/')
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 3);

      setCurrentHelp(relevantHelp);
      
      // Show help automatically for new users on complex pages
      if (!hasSeenHelp && (currentRoute.includes('admin') || currentRoute.includes('dashboard'))) {
        setIsVisible(true);
        setHasSeenHelp(true);
      }
    };

    getContextualHelp();
  }, [location.pathname, hasSeenHelp]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'tip': return <Lightbulb className="h-4 w-4" />;
      case 'guide': return <BookOpen className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'faq': return <MessageCircle className="h-4 w-4" />;
      default: return <HelpCircle className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'tip': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'guide': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'video': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'faq': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (currentHelp.length === 0) {
    return null;
  }

  const HelpContent = () => (
    <Card className="w-80">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4" />
            Helpful Tips
          </CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6"
            onClick={() => setIsVisible(false)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
        <CardDescription>
          Contextual help for this page
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {currentHelp.map((item, index) => (
          <div key={item.id} className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
            <div className="flex items-start gap-2 mb-2">
              <Badge className={cn("flex items-center gap-1 text-xs", getTypeColor(item.type))}>
                {getTypeIcon(item.type)}
                {item.type}
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Star className="h-2 w-2 mr-1" />
                {item.relevance}%
              </Badge>
            </div>
            
            <h4 className="font-medium text-sm mb-1">{item.title}</h4>
            <p className="text-xs text-muted-foreground mb-2">{item.content}</p>
            
            {item.action && (
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full text-xs h-7"
                onClick={item.action.onClick}
              >
                {item.action.label}
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>
        ))}
        
        <div className="flex gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" className="flex-1 text-xs">
            <MessageCircle className="h-3 w-3 mr-1" />
            Contact Support
          </Button>
          <Button variant="outline" size="sm" className="flex-1 text-xs">
            <BookOpen className="h-3 w-3 mr-1" />
            Help Center
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (position === 'relative') {
    return (
      <div className={className}>
        <HelpContent />
      </div>
    );
  }

  return (
    <>
      {/* Help Trigger Button */}
      <Popover open={isVisible} onOpenChange={setIsVisible}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "fixed bottom-20 right-4 z-40 rounded-full shadow-lg md:bottom-4",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              className
            )}
          >
            <HelpCircle className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          side="left" 
          align="end" 
          className="p-0 w-auto"
          sideOffset={8}
        >
          <HelpContent />
        </PopoverContent>
      </Popover>

      {/* New feature notification */}
      {!hasSeenHelp && currentHelp.length > 0 && (
        <div className="fixed bottom-32 right-4 z-50 md:bottom-16">
          <div className="bg-primary text-primary-foreground p-2 rounded-full animate-pulse">
            <Clock className="h-4 w-4" />
          </div>
        </div>
      )}
    </>
  );
};