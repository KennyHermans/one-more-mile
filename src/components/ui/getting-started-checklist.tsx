import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Circle, User, Search, CreditCard, FileText, MessageCircle, Star, Trophy, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  completed: boolean;
  actionText: string;
  actionUrl?: string;
  category: 'profile' | 'discovery' | 'booking' | 'engagement';
  priority: 'high' | 'medium' | 'low';
  estimatedTime: string;
}

interface GettingStartedChecklistProps {
  userId: string;
  userProfile: any;
  userBookings: any[];
  userDocuments: any[];
  userReviews: any[];
  className?: string;
}

export function GettingStartedChecklist({ 
  userId, 
  userProfile, 
  userBookings, 
  userDocuments, 
  userReviews, 
  className 
}: GettingStartedChecklistProps) {
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Load user's manually checked items from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`checklist_${userId}`);
    if (saved) {
      setCheckedItems(JSON.parse(saved));
    }
  }, [userId]);

  const toggleCheck = (itemId: string) => {
    const newCheckedItems = checkedItems.includes(itemId)
      ? checkedItems.filter(id => id !== itemId)
      : [...checkedItems, itemId];
    
    setCheckedItems(newCheckedItems);
    localStorage.setItem(`checklist_${userId}`, JSON.stringify(newCheckedItems));
  };

  const generateChecklistItems = (): ChecklistItem[] => {
    const hasProfile = userProfile && userProfile.full_name;
    const hasCompleteProfile = hasProfile && 
      userProfile.emergency_contact_name && 
      userProfile.emergency_contact_phone;
    const hasBookings = userBookings.length > 0;
    const hasPaidBooking = userBookings.some(b => b.payment_status === 'paid');
    const hasDocuments = userDocuments.length > 0;
    const hasReviews = userReviews.length > 0;

    return [
      {
        id: 'complete_profile',
        title: 'Complete Your Profile',
        description: 'Add your personal information and emergency contacts',
        icon: User,
        completed: hasCompleteProfile,
        actionText: hasProfile ? 'Complete Profile' : 'Set Up Profile',
        actionUrl: '/customer/profile',
        category: 'profile',
        priority: 'high',
        estimatedTime: '5 min'
      },
      {
        id: 'browse_trips',
        title: 'Explore Adventure Trips',
        description: 'Browse our collection of guided adventure trips',
        icon: Search,
        completed: checkedItems.includes('browse_trips'),
        actionText: 'Browse Trips',
        actionUrl: '/explore',
        category: 'discovery',
        priority: 'high',
        estimatedTime: '10 min'
      },
      {
        id: 'first_booking',
        title: 'Make Your First Booking',
        description: 'Reserve your spot on an adventure trip',
        icon: CreditCard,
        completed: hasBookings,
        actionText: 'Book a Trip',
        actionUrl: '/explore',
        category: 'booking',
        priority: 'high',
        estimatedTime: '15 min'
      },
      {
        id: 'upload_documents',
        title: 'Upload Travel Documents',
        description: 'Upload your passport and any required travel documents',
        icon: FileText,
        completed: hasDocuments,
        actionText: 'Upload Documents',
        category: 'profile',
        priority: 'medium',
        estimatedTime: '5 min'
      },
      {
        id: 'complete_payment',
        title: 'Complete Your First Payment',
        description: 'Pay for your first trip booking',
        icon: CreditCard,
        completed: hasPaidBooking,
        actionText: 'Complete Payment',
        category: 'booking',
        priority: 'high',
        estimatedTime: '5 min'
      },
      {
        id: 'join_community',
        title: 'Connect with Your Guide',
        description: 'Send a message to your trip guide',
        icon: MessageCircle,
        completed: checkedItems.includes('join_community'),
        actionText: 'Send Message',
        category: 'engagement',
        priority: 'medium',
        estimatedTime: '5 min'
      },
      {
        id: 'leave_review',
        title: 'Write Your First Review',
        description: 'Share your experience with other adventurers',
        icon: Star,
        completed: hasReviews,
        actionText: 'Write Review',
        category: 'engagement',
        priority: 'low',
        estimatedTime: '10 min'
      },
      {
        id: 'explore_features',
        title: 'Explore Dashboard Features',
        description: 'Discover all the tools available in your dashboard',
        icon: Trophy,
        completed: checkedItems.includes('explore_features'),
        actionText: 'Take Tour',
        category: 'discovery',
        priority: 'low',
        estimatedTime: '5 min'
      }
    ];
  };

  const items = generateChecklistItems();
  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;
  const progressPercentage = Math.round((completedCount / totalCount) * 100);

  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  const categoryLabels = {
    profile: 'Profile Setup',
    discovery: 'Discover & Explore',
    booking: 'Book Your Adventure',
    engagement: 'Community & Feedback'
  };

  const categoryIcons = {
    profile: User,
    discovery: Search,
    booking: CreditCard,
    engagement: MessageCircle
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-200 bg-red-50';
      case 'medium': return 'border-yellow-200 bg-yellow-50';
      case 'low': return 'border-green-200 bg-green-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Getting Started
            </CardTitle>
            <CardDescription>
              Complete these steps to make the most of your adventure experience
            </CardDescription>
          </div>
          <Badge variant="outline" className="font-semibold">
            {completedCount}/{totalCount} Complete
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Overview */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Your Progress</span>
            <span className="text-sm text-muted-foreground">{progressPercentage}%</span>
          </div>
          <Progress value={progressPercentage} className="h-3" />
          {progressPercentage === 100 && (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg">
              <Trophy className="h-5 w-5" />
              <span className="font-medium">Congratulations! You've completed the getting started checklist! 🎉</span>
            </div>
          )}
        </div>

        {/* Checklist Items by Category */}
        <div className="space-y-6">
          {Object.entries(groupedItems).map(([category, categoryItems]) => {
            const CategoryIcon = categoryIcons[category as keyof typeof categoryIcons];
            const completedInCategory = categoryItems.filter(item => item.completed).length;
            
            return (
              <div key={category} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="flex items-center gap-2 text-sm font-medium">
                    <CategoryIcon className="h-4 w-4" />
                    {categoryLabels[category as keyof typeof categoryLabels]}
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    {completedInCategory}/{categoryItems.length}
                  </span>
                </div>
                
                <div className="space-y-3">
                  {categoryItems.map((item) => (
                    <div 
                      key={item.id} 
                      className={`border rounded-lg p-4 transition-all ${
                        item.completed ? 'bg-green-50 border-green-200' : getPriorityColor(item.priority)
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex items-center pt-1">
                          {item.completed ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <Checkbox
                              checked={checkedItems.includes(item.id)}
                              onCheckedChange={() => toggleCheck(item.id)}
                              disabled={item.completed}
                            />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <item.icon className="h-4 w-4 text-muted-foreground" />
                            <h5 className={`font-medium ${item.completed ? 'text-green-700' : 'text-foreground'}`}>
                              {item.title}
                            </h5>
                            <div className="flex gap-1">
                              <Badge 
                                variant="secondary" 
                                className={`text-xs ${getPriorityBadgeColor(item.priority)}`}
                              >
                                {item.priority}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {item.estimatedTime}
                              </Badge>
                            </div>
                          </div>
                          
                          <p className={`text-sm mb-3 ${
                            item.completed ? 'text-green-600' : 'text-muted-foreground'
                          }`}>
                            {item.description}
                          </p>
                          
                          {!item.completed && item.actionUrl && (
                            <Button size="sm" variant="outline" asChild>
                              <Link to={item.actionUrl} className="flex items-center gap-2">
                                {item.actionText}
                                <ArrowRight className="h-3 w-3" />
                              </Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}