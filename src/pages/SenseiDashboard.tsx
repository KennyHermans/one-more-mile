import React, { useState, useEffect } from "react";
import { Navigation } from "@/components/ui/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SenseiDashboardLayout } from "@/components/ui/sensei-dashboard-layout";
import { SenseiOverviewDashboard } from "@/components/ui/sensei-overview-dashboard";
import { SenseiTripsManagement } from "@/components/ui/sensei-trips-management";
import { SenseiLevelProvider } from "@/contexts/SenseiLevelContext";
import { useSenseiPermissions } from "@/hooks/use-sensei-permissions";
import { TripCreationManager } from "@/components/ui/trip-creation-manager";
import { Trip } from "@/types/trip";
import { Plus, Wand2 } from "lucide-react";

interface SenseiProfile {
  id: string;
  user_id: string;
  name: string;
  bio: string;
  specialty: string;
  location: string;
  specialties: string[];
  experience: string;
  image_url?: string;
  rating: number;
  trips_led: number;
  sensei_level: 'apprentice' | 'journey_guide' | 'master_sensei';
  can_create_trips: boolean;
}


const SenseiDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [senseiProfile, setSenseiProfile] = useState<SenseiProfile | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();

  const { permissions: senseiPermissions } = useSenseiPermissions(senseiProfile?.id);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        window.location.href = '/auth';
        return;
      }
      
      setUser(user);
      await Promise.all([
        fetchSenseiProfile(user.id),
        fetchSenseiTrips(user.id)
      ]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to authenticate.",
        variant: "destructive",
      });
      window.location.href = '/auth';
    } finally {
      setLoading(false);
    }
  };

  const fetchSenseiProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('sensei_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      setSenseiProfile({
        ...data,
        sensei_level: data.sensei_level as 'apprentice' | 'journey_guide' | 'master_sensei'
      });
    } catch (error) {
      console.error('Error fetching sensei profile:', error);
    }
  };

  const fetchSenseiTrips = async (userId: string) => {
    try {
      const { data: profileData } = await supabase
        .from('sensei_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!profileData) return;

      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('sensei_id', profileData.id);

      if (error) throw error;
      setTrips((data as any) || []);
    } catch (error) {
      console.error('Error fetching sensei trips:', error);
    }
  };

  const renderTabContent = () => {
    if (!senseiProfile) return <div>Loading...</div>;

    switch (activeTab) {
      case "overview":
        return (
          <SenseiOverviewDashboard
            senseiProfile={{
              id: senseiProfile.id,
              name: senseiProfile.name,
              bio: senseiProfile.bio,
              location: senseiProfile.location,
              rating: senseiProfile.rating,
              trips_led: senseiProfile.trips_led,
              sensei_level: senseiProfile.sensei_level,
              can_create_trips: senseiProfile.can_create_trips
            }}
            stats={{
              activeTrips: trips.filter(t => t.is_active && t.trip_status === 'approved').length,
              completedTrips: senseiProfile.trips_led || 0,
              upcomingTrips: trips.filter(t => t.is_active).length,
              totalParticipants: trips.reduce((sum, trip) => sum + (trip.current_participants || 0), 0),
              rating: senseiProfile.rating || 0
            }}
            quickActions={[
              {
                title: "Create Trip",
                description: senseiPermissions?.can_create_trips ? "Design your next adventure" : "Reach higher level to unlock",
                icon: Plus,
                action: senseiPermissions?.can_create_trips ? () => setActiveTab("create-trip") : () => setActiveTab("gamification"),
                variant: senseiPermissions?.can_create_trips ? "default" : "outline"
              }
            ]}
            onTabChange={setActiveTab}
          />
        );

      case "trips":
        return (
          <SenseiTripsManagement
            trips={trips}
            canCreateTrips={senseiPermissions?.can_create_trips || false}
            canEditTrips={senseiPermissions?.can_edit_trips || false}
            onCreateTrip={() => setActiveTab("create-trip")}
            onEditTrip={() => {}}
            onViewTrip={(trip) => {
              window.location.href = `/trip/${trip.id}`;
            }}
            onCancelTrip={() => {}}
          />
        );

      case "create-trip":
        return (
          <TripCreationManager 
            senseiId={senseiProfile.id}
            mode="create-trip"
            onSuccess={() => {
              if (user) fetchSenseiTrips(user.id);
              toast({
                title: "Success",
                description: "Trip created successfully!",
              });
            }}
          />
        );

      case "ai-builder":
        return (
          <TripCreationManager 
            senseiId={senseiProfile.id}
            mode="ai-builder"
            onSuccess={() => {
              if (user) fetchSenseiTrips(user.id);
              toast({
                title: "Success",
                description: "AI trip created successfully!",
              });
            }}
          />
        );

      default:
        return (
          <Card>
            <CardContent className="pt-6 text-center">
              <h3 className="text-lg font-semibold mb-2">Feature Coming Soon</h3>
              <p className="text-muted-foreground">This section is under development.</p>
            </CardContent>
          </Card>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!senseiProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Complete Your Sensei Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              You need to complete your sensei profile to access the dashboard.
            </p>
            <Button onClick={() => window.location.href = '/sensei/profile'}>
              Complete Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <SenseiLevelProvider senseiId={senseiProfile.id}>
      <SenseiDashboardLayout
        senseiName={senseiProfile.name}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onEditProfile={() => {}}
      >
        {renderTabContent()}
      </SenseiDashboardLayout>
    </SenseiLevelProvider>
  );
};

export default SenseiDashboard;