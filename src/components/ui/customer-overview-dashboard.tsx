import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// PersonalizedDashboard component removed for simplification
import { ProfileCompletionIndicator } from "@/components/ui/profile-completion-indicator";

import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, CheckSquare, Star, TrendingUp } from "lucide-react";
import { TripBooking } from '@/types/trip';

interface CustomerProfile {
  id: string;
  full_name: string;
  phone: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  dietary_restrictions: string;
  medical_conditions: string;
}


interface Document {
  id: string;
  document_name: string;
  document_type: string;
  file_url: string;
  uploaded_at: string;
}

interface CustomerOverviewDashboardProps {
  userId: string;
  profile: CustomerProfile | null;
  bookings: TripBooking[];
  documents: Document[];
  userReviews: any[];
}

export function CustomerOverviewDashboard({ 
  userId, 
  profile, 
  bookings, 
  documents, 
  userReviews 
}: CustomerOverviewDashboardProps) {
  // Calculate key metrics
  const totalSpent = bookings
    .filter(b => b.payment_status === 'paid')
    .reduce((sum, b) => sum + b.total_amount, 0);
  
  const pendingPayments = bookings.filter(b => b.payment_status === 'pending').length;
  const confirmedTrips = bookings.filter(b => b.payment_status === 'paid').length;
  const reviewsPending = bookings.filter(b => 
    b.payment_status === 'paid' && 
    !userReviews.some(r => r.trip_id === b.trip_id)
  ).length;

  const isNewUser = !profile || bookings.length === 0;
  const isProfileIncomplete = profile && (!profile.emergency_contact_name || !profile.emergency_contact_phone);

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="text-center py-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Welcome back{profile ? `, ${profile.full_name}` : ''}!
        </h1>
        <p className="text-muted-foreground">
          Here's what's happening with your travel journey
        </p>
      </div>

      {/* Profile Completion for New Users */}
      {isNewUser && (
        <ProfileCompletionIndicator 
          profile={profile} 
          documents={documents}
          className="mb-6"
        />
      )}

      {/* Profile Completion for Existing Users */}
      {!isNewUser && isProfileIncomplete && (
        <ProfileCompletionIndicator 
          profile={profile} 
          documents={documents}
          className="mb-6"
        />
      )}

      {/* Quick Stats Cards */}
      {!isNewUser && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Spent</p>
                  <p className="text-2xl font-bold">${totalSpent.toLocaleString()}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Confirmed Trips</p>
                  <p className="text-2xl font-bold">{confirmedTrips}</p>
                </div>
                <CalendarIcon className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Payments</p>
                  <p className="text-2xl font-bold">{pendingPayments}</p>
                </div>
                <CheckSquare className="h-8 w-8 text-orange-600" />
              </div>
              {pendingPayments > 0 && (
                <Badge variant="destructive" className="mt-2">Action Required</Badge>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Reviews Pending</p>
                  <p className="text-2xl font-bold">{reviewsPending}</p>
                </div>
                <Star className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Simplified for better UX */}
      {!isNewUser && (
        <Card>
          <CardHeader>
            <CardTitle>Welcome Back!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Focus on your upcoming trips and complete any pending actions
            </p>
          </CardContent>
        </Card>
      )}

    </div>
  );
}