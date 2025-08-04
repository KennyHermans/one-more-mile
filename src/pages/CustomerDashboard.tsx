import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { TripMessagingEnhanced } from "@/components/ui/trip-messaging-enhanced";
import { TripReviewDialog } from "@/components/ui/trip-review-dialog";
import { PersonalizedDashboard } from "@/components/ui/personalized-dashboard";
import { TripTimelineVisualization } from "@/components/ui/trip-timeline-visualization";
import { SmartNotifications } from "@/components/ui/smart-notifications";
import { CommunicationHub } from "@/components/ui/communication-hub";
import { OnboardingWizard } from "@/components/ui/onboarding-wizard";
import { ProfileCompletionIndicator } from "@/components/ui/profile-completion-indicator";
import { GettingStartedChecklist } from "@/components/ui/getting-started-checklist";
import { GuidedTour } from "@/components/ui/guided-tour";
import { CustomerWishlist } from "@/components/ui/customer-wishlist";
import { EnhancedTripCard } from "@/components/ui/enhanced-trip-card";
import { CustomerOverviewDashboard } from "@/components/ui/customer-overview-dashboard";
import { CustomerTripsDashboard } from "@/components/ui/customer-trips-dashboard";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, MapPin, Calendar as CalendarIcon, CheckSquare, User, FileText, MessageCircle, Star, Megaphone, AlertTriangle, Info, Bell } from "lucide-react";
import { CustomerDashboardLayout } from "@/components/ui/customer-dashboard-layout";
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

// TripBooking interface moved to @/types/trip for standardization

interface Todo {
  id: string;
  title: string;
  description: string;
  due_date: string;
  completed: boolean;
  created_by_admin: boolean;
}

interface Document {
  id: string;
  document_name: string;
  document_type: string;
  file_url: string;
  uploaded_at: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'normal' | 'high' | 'urgent';
  trip_id?: string;
  created_at: string;
  is_active: boolean;
  trips?: {
    title: string;
    destination: string;
  };
}

const CustomerDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [bookings, setBookings] = useState<TripBooking[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [newTodo, setNewTodo] = useState({ title: "", description: "", due_date: "" });
  const [uploading, setUploading] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedTripForReview, setSelectedTripForReview] = useState<any>(null);
  const [userReviews, setUserReviews] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [wishlistCount, setWishlistCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/auth';
        return;
      }
      setUser(user);
      await Promise.all([
        fetchProfile(user.id),
        fetchBookings(user.id),
        fetchTodos(user.id),
        fetchDocuments(user.id),
        fetchUserReviews(user.id),
        fetchAnnouncements(user.id),
        fetchWishlistCount(user.id)
      ]);
      
      const messageCount = await fetchUnreadMessageCount(user.id);
      setUnreadMessageCount(messageCount);
      
      // Check if user needs onboarding
      checkOnboardingStatus(user.id);
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

  const checkOnboardingStatus = async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from('customer_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      // Show onboarding if no profile exists
      if (!profile) {
        setShowOnboarding(true);
      } else {
        // Show tour for first-time users
        const hasSeenTour = localStorage.getItem('hasSeenTour');
        if (!hasSeenTour) {
          setShowTour(true);
        }
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    }
  };

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('customer_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    setProfile(data);
  };

  const fetchBookings = async (userId: string) => {
    const { data, error } = await supabase
      .from('trip_bookings')
      .select(`
        *,
        trip:trips (
          id,
          title,
          destination,
          dates,
          start_date,
          end_date,
          price,
          theme,
          sensei_name,
          sensei_id,
          image_url,
          difficulty_level,
          current_participants,
          max_participants,
          rating,
          trip_status
        )
      `)
      .eq('user_id', userId);
    
    if (error) throw error;
    setBookings(data || []);
  };

  const fetchTodos = async (userId: string) => {
    const { data, error } = await supabase
      .from('customer_todos')
      .select('*')
      .eq('user_id', userId)
      .order('due_date', { ascending: true });
    
    if (error) throw error;
    setTodos(data || []);
  };

  const fetchDocuments = async (userId: string) => {
    const { data, error } = await supabase
      .from('customer_documents')
      .select('*')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false });
    
    if (error) throw error;
    setDocuments(data || []);
  };

  const fetchUserReviews = async (userId: string) => {
    const { data, error } = await supabase
      .from('trip_reviews')
      .select(`
        *,
        trips (
          title,
          destination,
          sensei_name,
          sensei_id
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    setUserReviews(data || []);
  };

  const fetchUnreadMessageCount = async (userId: string) => {
    try {
      // Get all trip IDs where user has paid bookings
      const { data: userTripIds } = await supabase
        .from('trip_bookings')
        .select('trip_id')
        .eq('user_id', userId)
        .eq('payment_status', 'paid');

      if (!userTripIds || userTripIds.length === 0) {
        return 0;
      }

      const tripIds = userTripIds.map(booking => booking.trip_id);

      // Count unread messages in those trips where sender is not the current user
      const { count } = await supabase
        .from('trip_messages')
        .select('*', { count: 'exact', head: true })
        .in('trip_id', tripIds)
        .neq('sender_id', userId)
        .is('read_at', null);

      return count || 0;
    } catch (error) {
      console.error('Error fetching unread message count:', error);
      return 0;
    }
  };

  const handleReviewTrip = (booking: TripBooking) => {
    setSelectedTripForReview({
      id: booking.trip_id,
      title: booking.trip?.title,
      sensei_name: booking.trip?.sensei_name,
      sensei_id: booking.trip?.sensei_id || ''
    });
    setReviewDialogOpen(true);
  };

  const fetchAnnouncements = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Get trip titles for trip-specific announcements
      const announcementsWithTrips = await Promise.all(
        (data || []).map(async (announcement: any) => {
          if (announcement.trip_id) {
            const { data: tripData } = await supabase
              .from('trips')
              .select('title, destination')
              .eq('id', announcement.trip_id)
              .single();
            
            return {
              ...announcement,
              trips: tripData
            };
          }
          return announcement;
        })
      );
      
      setAnnouncements(announcementsWithTrips as Announcement[]);
    } catch (error: any) {
      console.error('Error fetching announcements:', error);
    }
  };

  const fetchWishlistCount = async (userId: string) => {
    try {
      const { count, error } = await supabase
        .from('customer_wishlists')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) throw error;
      setWishlistCount(count || 0);
    } catch (error: any) {
      console.error('Error fetching wishlist count:', error);
    }
  };

  const handleReviewSuccess = () => {
    if (user) {
      fetchUserReviews(user.id);
    }
  };

  const handleOnboardingComplete = async () => {
    if (user) {
      await fetchProfile(user.id);
      setShowOnboarding(false);
      
      // Show tour after onboarding
      const hasSeenTour = localStorage.getItem('hasSeenTour');
      if (!hasSeenTour) {
        setTimeout(() => setShowTour(true), 1000);
      }
    }
  };

  const handleTourComplete = () => {
    setShowTour(false);
    localStorage.setItem('hasSeenTour', 'true');
  };

  const updateProfile = async () => {
    if (!user || !profile) return;

    try {
      const { error } = await supabase
        .from('customer_profiles')
        .upsert({
          user_id: user.id,
          ...profile
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addTodo = async () => {
    if (!user || !newTodo.title) return;

    try {
      const { error } = await supabase
        .from('customer_todos')
        .insert({
          user_id: user.id,
          title: newTodo.title,
          description: newTodo.description,
          due_date: newTodo.due_date || null,
          created_by_admin: false
        });

      if (error) throw error;

      setNewTodo({ title: "", description: "", due_date: "" });
      await fetchTodos(user.id);
      toast({
        title: "Success",
        description: "Todo added successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleTodo = async (todoId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('customer_todos')
        .update({ completed })
        .eq('id', todoId);

      if (error) throw error;
      await fetchTodos(user.id);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const uploadDocument = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('customer-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('customer-documents')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('customer_documents')
        .insert({
          user_id: user.id,
          document_name: file.name,
          document_type: fileExt || 'unknown',
          file_url: publicUrl
        });

      if (dbError) throw dbError;

      await fetchDocuments(user.id);
      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const cancelBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('trip_bookings')
        .delete()
        .eq('id', bookingId)
        .eq('payment_status', 'pending'); // Only allow canceling unpaid reservations

      if (error) throw error;

      await fetchBookings(user.id);
      toast({
        title: "Success",
        description: "Reservation cancelled successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handlePayNow = async (booking: TripBooking) => {
    if (!user) return;
    
    setPaymentLoading(booking.id);
    try {
      const { data, error } = await supabase.functions.invoke('create-payment-plan', {
        body: {
          tripId: booking.trip_id,
          fullPayment: true
        }
      });

      if (error) throw error;

      if (data?.url) {
        // Open Stripe checkout in a new tab
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast({
        title: "Payment Error",
        description: error.message || "Failed to start payment process",
        variant: "destructive",
      });
    } finally {
      setPaymentLoading(null);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const handleEditProfile = () => {
    setActiveTab("profile");
  };

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return user && (
          <CustomerOverviewDashboard
            userId={user.id}
            profile={profile}
            bookings={bookings}
            documents={documents}
            userReviews={userReviews}
          />
        );

      case "trips":
        return (
          <CustomerTripsDashboard
            bookings={bookings}
            onPayNow={handlePayNow}
            onCancel={cancelBooking}
            paymentLoading={paymentLoading}
          />
        );

      case "notifications":
        return <SmartNotifications />;

      case "messages":
        return user && <CommunicationHub userId={user.id} />;

      case "legacy-messages":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Trip Messages</CardTitle>
                <CardDescription>Communicate with your trip sensei for paid trips</CardDescription>
              </CardHeader>
              <CardContent>
                {bookings.filter(booking => booking.payment_status === 'paid').length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    You need to have a paid trip booking to message with your sensei.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {bookings
                      .filter(booking => booking.payment_status === 'paid')
                      .map((booking) => (
                        <Card key={booking.id}>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-semibold">{booking.trip.title}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {booking.trip.destination} • Sensei: {booking.trip.sensei_name}
                                </p>
                              </div>
                              <Badge variant="default">Paid</Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <TripMessagingEnhanced
                              tripId={booking.trip_id}
                              tripTitle={booking.trip.title}
                              userType="customer"
                            />
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case "news":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5" />
                  News & Announcements
                </CardTitle>
                <CardDescription>
                  Stay updated with important information and updates from your senseis
                </CardDescription>
              </CardHeader>
              <CardContent>
                {announcements.length === 0 ? (
                  <div className="text-center py-8">
                    <Megaphone className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-muted-foreground">No announcements yet</p>
                    <p className="text-sm text-muted-foreground">
                      Check back later for updates from your senseis
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {announcements.map((announcement) => {
                      const priorityIcon = announcement.priority === 'urgent' ? AlertTriangle : 
                                         announcement.priority === 'high' ? Info : 
                                         Megaphone;
                      const PriorityIcon = priorityIcon;
                      
                      return (
                        <Card 
                          key={announcement.id} 
                          className={`border-l-4 ${
                            announcement.priority === 'urgent' ? 'border-l-red-500 bg-red-50' :
                            announcement.priority === 'high' ? 'border-l-yellow-500 bg-yellow-50' :
                            'border-l-blue-500 bg-blue-50'
                          }`}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <PriorityIcon className={`h-5 w-5 mt-1 ${
                                  announcement.priority === 'urgent' ? 'text-red-600' :
                                  announcement.priority === 'high' ? 'text-yellow-600' :
                                  'text-blue-600'
                                }`} />
                                <div>
                                  <h3 className="font-semibold text-lg">{announcement.title}</h3>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge 
                                      variant={
                                        announcement.priority === 'urgent' ? 'destructive' :
                                        announcement.priority === 'high' ? 'default' : 'secondary'
                                      }
                                      className="text-xs"
                                    >
                                      {announcement.priority}
                                    </Badge>
                                    {announcement.trip_id && announcement.trips && (
                                      <Badge variant="outline" className="text-xs">
                                        {announcement.trips.title}
                                      </Badge>
                                    )}
                                    {!announcement.trip_id && (
                                      <Badge variant="outline" className="text-xs">
                                        General
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {new Date(announcement.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                              {announcement.content}
                            </p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case "reviews":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Trip Reviews</CardTitle>
                <CardDescription>Review your completed trips and see your past reviews</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Trips that can be reviewed */}
                <div className="space-y-4 mb-8">
                  <h3 className="font-semibold">Trips Available for Review</h3>
                  {bookings
                    .filter(booking => 
                      booking.payment_status === 'paid' && 
                      !userReviews.some(review => review.trip_id === booking.trip_id)
                    )
                    .length === 0 ? (
                    <p className="text-muted-foreground">No trips available for review.</p>
                  ) : (
                    <div className="grid gap-4">
                      {bookings
                        .filter(booking => 
                          booking.payment_status === 'paid' && 
                          !userReviews.some(review => review.trip_id === booking.trip_id)
                        )
                        .map((booking) => (
                          <Card key={booking.id} className="overflow-hidden">
                            <div className="flex">
                              <img 
                                src={booking.trip.image_url} 
                                alt={booking.trip.title}
                                className="w-24 h-24 object-cover"
                              />
                              <CardContent className="flex-1 p-4">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <h4 className="font-semibold">{booking.trip.title}</h4>
                                    <p className="text-sm text-muted-foreground">{booking.trip.destination}</p>
                                    <p className="text-sm">Sensei: {booking.trip.sensei_name}</p>
                                  </div>
                                  <Button 
                                    onClick={() => handleReviewTrip(booking)}
                                    className="flex items-center gap-2"
                                  >
                                    <Star className="h-4 w-4" />
                                    Write Review
                                  </Button>
                                </div>
                              </CardContent>
                            </div>
                          </Card>
                        ))}
                    </div>
                  )}
                </div>

                {/* Past reviews */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Your Reviews</h3>
                  {userReviews.length === 0 ? (
                    <p className="text-muted-foreground">You haven't written any reviews yet.</p>
                  ) : (
                    <div className="grid gap-4">
                      {userReviews.map((review) => (
                        <Card key={review.id}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-semibold">{review.trips?.title}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {review.trips?.destination} • Sensei: {review.trips?.sensei_name}
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-4 w-4 ${
                                      i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            {review.review_text && (
                              <p className="text-sm text-muted-foreground mb-2">{review.review_text}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Reviewed on {new Date(review.created_at).toLocaleDateString()}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "wishlist":
        return user ? <CustomerWishlist userId={user.id} /> : null;

      case "profile":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>This information is visible to admin and your trip sensei</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={profile?.full_name || ""}
                      onChange={(e) => setProfile(prev => prev ? { ...prev, full_name: e.target.value } : null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={profile?.phone || ""}
                      onChange={(e) => setProfile(prev => prev ? { ...prev, phone: e.target.value } : null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                    <Input
                      id="emergency_contact_name"
                      value={profile?.emergency_contact_name || ""}
                      onChange={(e) => setProfile(prev => prev ? { ...prev, emergency_contact_name: e.target.value } : null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
                    <Input
                      id="emergency_contact_phone"
                      value={profile?.emergency_contact_phone || ""}
                      onChange={(e) => setProfile(prev => prev ? { ...prev, emergency_contact_phone: e.target.value } : null)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="dietary_restrictions">Dietary Restrictions</Label>
                  <Textarea
                    id="dietary_restrictions"
                    value={profile?.dietary_restrictions || ""}
                    onChange={(e) => setProfile(prev => prev ? { ...prev, dietary_restrictions: e.target.value } : null)}
                  />
                </div>
                <div>
                  <Label htmlFor="medical_conditions">Medical Conditions</Label>
                  <Textarea
                    id="medical_conditions"
                    value={profile?.medical_conditions || ""}
                    onChange={(e) => setProfile(prev => prev ? { ...prev, medical_conditions: e.target.value } : null)}
                  />
                </div>
                <Button onClick={updateProfile}>Save Profile</Button>
              </CardContent>
            </Card>
          </div>
        );

      case "calendar":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Trip Calendar</CardTitle>
                <CardDescription>View your trip dates and important deadlines</CardDescription>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>
          </div>
        );

      case "todos":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>To-Do List</CardTitle>
                <CardDescription>Track your trip preparation tasks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a new task..."
                    value={newTodo.title}
                    onChange={(e) => setNewTodo(prev => ({ ...prev, title: e.target.value }))}
                  />
                  <Input
                    type="date"
                    value={newTodo.due_date}
                    onChange={(e) => setNewTodo(prev => ({ ...prev, due_date: e.target.value }))}
                  />
                  <Button onClick={addTodo}>Add</Button>
                </div>
                <div className="space-y-2">
                  {todos.map((todo) => (
                    <div key={todo.id} className="flex items-center space-x-2 p-3 border rounded">
                      <Checkbox
                        checked={todo.completed}
                        onCheckedChange={(checked) => toggleTodo(todo.id, !!checked)}
                      />
                      <div className="flex-1">
                        <p className={`font-medium ${todo.completed ? 'line-through text-muted-foreground' : ''}`}>
                          {todo.title}
                        </p>
                        {todo.description && (
                          <p className="text-sm text-muted-foreground">{todo.description}</p>
                        )}
                        {todo.due_date && (
                          <p className="text-xs text-muted-foreground">Due: {todo.due_date}</p>
                        )}
                      </div>
                      {todo.created_by_admin && (
                        <Badge variant="outline">Admin</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "documents":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Documents</CardTitle>
                <CardDescription>Upload important documents like passport, visa, etc.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <Input
                    type="file"
                    onChange={uploadDocument}
                    className="hidden"
                    id="document-upload"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  />
                  <Label htmlFor="document-upload" className="cursor-pointer">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">
                      {uploading ? "Uploading..." : "Click to upload documents"}
                    </p>
                  </Label>
                </div>
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">{doc.document_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {doc.document_type.toUpperCase()} • {new Date(doc.uploaded_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" asChild>
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  const notificationCounts = {
    notifications: announcements.length,
    messages: unreadMessageCount,
    trips: bookings.filter(b => b.payment_status === "pending").length,
    wishlist: wishlistCount
  };

  return (
    <CustomerDashboardLayout
      customerName={profile?.full_name}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onEditProfile={handleEditProfile}
      notificationCounts={notificationCounts}
    >
      <div data-tour-target="dashboard-title">
        {renderContent()}
      </div>

      {/* Review Dialog */}
      {selectedTripForReview && (
        <TripReviewDialog
          open={reviewDialogOpen}
          onOpenChange={setReviewDialogOpen}
          trip={selectedTripForReview}
          onSuccess={handleReviewSuccess}
        />
      )}

      {/* Onboarding Wizard */}
      {user && (
        <OnboardingWizard
          isOpen={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          userId={user.id}
          onComplete={handleOnboardingComplete}
        />
      )}

      {/* Guided Tour */}
      <GuidedTour
        autoStart={showTour}
        onComplete={handleTourComplete}
        onSkip={() => setShowTour(false)}
      />
    </CustomerDashboardLayout>
  );
};

export default CustomerDashboard;