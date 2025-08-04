import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EnhancedTripCard } from "@/components/ui/enhanced-trip-card";
import { TripTimelineVisualization } from "@/components/ui/trip-timeline-visualization";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, DollarSign, Clock } from "lucide-react";
import { TripBooking } from '@/types/trip';

interface CustomerTripsDashboardProps {
  bookings: TripBooking[];
  onPayNow: (booking: TripBooking) => Promise<void>;
  onCancel: (bookingId: string) => Promise<void>;
  paymentLoading: string | null;
}

export function CustomerTripsDashboard({ 
  bookings, 
  onPayNow, 
  onCancel, 
  paymentLoading 
}: CustomerTripsDashboardProps) {
  const [activeTab, setActiveTab] = useState("all");

  // Separate bookings by status
  const pendingBookings = bookings.filter(b => b.payment_status === 'pending');
  const confirmedBookings = bookings.filter(b => b.payment_status === 'paid');
  
  // Calculate stats
  const totalSpent = confirmedBookings.reduce((sum, b) => sum + b.total_amount, 0);
  const pendingAmount = pendingBookings.reduce((sum, b) => sum + b.total_amount, 0);

  const renderTripStats = () => (
    <div className="grid gap-4 md:grid-cols-3 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Trips</p>
              <p className="text-xl font-bold">{bookings.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Spent</p>
              <p className="text-xl font-bold">${totalSpent.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending Payment</p>
              <p className="text-xl font-bold">${pendingAmount.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderTripSection = (trips: TripBooking[], title: string, description: string, variant: "default" | "destructive" | "secondary") => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        <Badge variant={variant}>{trips.length}</Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      
      {trips.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No trips in this category</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {trips.map((booking) => (
            <EnhancedTripCard
              key={booking.id}
              booking={booking}
              onPayNow={onPayNow}
              onCancel={onCancel}
              paymentLoading={paymentLoading === booking.id}
            />
          ))}
        </div>
      )}
    </div>
  );

  if (bookings.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <MapPin className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No trips booked yet</h3>
          <p className="text-muted-foreground mb-6">
            Start your adventure by browsing our amazing trips and finding the perfect sensei for you.
          </p>
          <a 
            href="/explore" 
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            Explore Trips
          </a>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-tour-target="trips-tab">
      {/* Trip Statistics */}
      {renderTripStats()}

      {/* Trip Timeline */}
      {bookings.length > 0 && (
        <TripTimelineVisualization tripBookings={bookings} />
      )}

      {/* Trip Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">
            All Trips ({bookings.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="text-orange-600">
            Payment Required ({pendingBookings.length})
          </TabsTrigger>
          <TabsTrigger value="confirmed" className="text-green-600">
            Confirmed ({confirmedBookings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6 mt-6">
          {pendingBookings.length > 0 && 
            renderTripSection(
              pendingBookings, 
              "Payment Required", 
              "Complete your payment to confirm these trips",
              "destructive"
            )
          }
          
          {confirmedBookings.length > 0 && 
            renderTripSection(
              confirmedBookings, 
              "Confirmed Trips", 
              "Your paid and confirmed travel experiences",
              "default"
            )
          }
        </TabsContent>

        <TabsContent value="pending" className="mt-6">
          {renderTripSection(
            pendingBookings, 
            "Payment Required", 
            "Complete your payment to confirm these trips. Payment deadlines may apply.",
            "destructive"
          )}
        </TabsContent>

        <TabsContent value="confirmed" className="mt-6">
          {renderTripSection(
            confirmedBookings, 
            "Confirmed Trips", 
            "Your paid and confirmed travel experiences. You can message your sensei for these trips.",
            "default"
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}