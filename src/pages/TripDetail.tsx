import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Navigation } from "@/components/ui/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TripItineraryMap } from "@/components/ui/trip-itinerary-map";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Users, 
  Star, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  CreditCard
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProgramDay {
  day: number;
  location: string;
  activities: string;
}

interface Trip {
  id: string;
  title: string;
  destination: string;
  description: string;
  price: string;
  dates: string;
  group_size: string;
  sensei_name: string;
  sensei_id: string | null;
  image_url: string;
  theme: string;
  rating: number;
  duration_days: number;
  difficulty_level: string;
  included_amenities: string[];
  excluded_items: string[];
  requirements: string[];
  max_participants: number;
  current_participants: number;
  program: ProgramDay[];
}

interface SenseiProfile {
  id: string;
  name: string;
  specialty: string;
  bio: string;
  experience: string;
  location: string;
  image_url: string | null;
  rating: number;
  trips_led: number;
}

const TripDetail = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [senseiProfile, setSenseiProfile] = useState<SenseiProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [bookingForm, setBookingForm] = useState({
    full_name: "",
    address: "",
    email: "",
    phone: "",
    payNow: false
  });
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user?.email) {
      setBookingForm(prev => ({ ...prev, email: user.email }));
    }
  };

  const handleBookTrip = (payNow: boolean) => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to create an account to book a trip.",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }
    setBookingForm(prev => ({ ...prev, payNow }));
    setShowBookingDialog(true);
  };

  const handleBookingSubmit = async () => {
    if (!user || !trip) return;

    setBookingLoading(true);
    try {
      // Extract price as number
      const priceString = trip.price.replace(/[^0-9.]/g, '');
      const totalAmount = parseFloat(priceString);

      // Set payment status based on user choice
      const paymentStatus = bookingForm.payNow ? 'paid' : 'pending';
      const bookingStatus = bookingForm.payNow ? 'confirmed' : 'reserved';

      // Create booking
      const { error: bookingError } = await supabase
        .from('trip_bookings')
        .insert({
          trip_id: trip.id,
          user_id: user.id,
          total_amount: totalAmount,
          payment_status: paymentStatus,
          booking_status: bookingStatus
        });

      if (bookingError) throw bookingError;

      // Create or update customer profile with basic info
      const { error: profileError } = await supabase
        .from('customer_profiles')
        .upsert({
          user_id: user.id,
          full_name: bookingForm.full_name,
          phone: bookingForm.phone
        });

      if (profileError) throw profileError;

      // Create initial todos for the customer
      const defaultTodos = [
        { title: "Complete passport verification", description: "Upload a clear photo of your passport", due_date: null, created_by_admin: true },
        { title: "Submit travel insurance details", description: "Provide proof of travel insurance coverage", due_date: null, created_by_admin: true },
        { title: "Add emergency contact details", description: "Complete your emergency contact information", due_date: null, created_by_admin: true },
        { title: "Update dietary restrictions", description: "Let us know about any dietary restrictions or allergies", due_date: null, created_by_admin: true },
        { title: "Medical conditions", description: "Share any medical conditions we should be aware of", due_date: null, created_by_admin: true }
      ];

      const todoInserts = defaultTodos.map(todo => ({
        user_id: user.id,
        trip_id: trip.id,
        ...todo
      }));

      const { error: todoError } = await supabase
        .from('customer_todos')
        .insert(todoInserts);

      if (todoError) throw todoError;

      const successMessage = bookingForm.payNow 
        ? "Payment successful! Your trip is confirmed."
        : "Reservation successful! You can pay later in your dashboard.";

      toast({
        title: bookingForm.payNow ? "Booking confirmed!" : "Reservation successful!",
        description: successMessage,
      });

      setShowBookingDialog(false);
      navigate('/customer/dashboard');
    } catch (error: any) {
      toast({
        title: "Booking failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setBookingLoading(false);
    }
  };

  useEffect(() => {
    if (!tripId) return;

    const fetchTrip = async () => {
      try {
        const { data, error } = await supabase
          .from('trips')
          .select('*')
          .eq('id', tripId)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          toast({
            title: "Trip Not Found",
            description: "The trip you're looking for doesn't exist.",
            variant: "destructive",
          });
          return;
        }

        // Parse program JSON if it exists
        const parsedTrip = {
          ...data,
          program: data.program ? (Array.isArray(data.program) ? data.program : JSON.parse(data.program as string)) : []
        };
        setTrip(parsedTrip);

        // Fetch sensei profile if linked
        if (data.sensei_id) {
          const { data: senseiData, error: senseiError } = await supabase
            .from('sensei_profiles')
            .select('*')
            .eq('id', data.sensei_id)
            .maybeSingle();

          if (senseiError) {
            console.error('Error fetching sensei profile:', senseiError);
          } else {
            setSenseiProfile(senseiData);
          }
        }
      } catch (error: any) {
        console.error('Error fetching trip:', error);
        toast({
          title: "Error",
          description: "Failed to load trip details. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTrip();
  }, [tripId, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container py-20">
          <div className="text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded w-1/3 mx-auto"></div>
              <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">Trip Not Found</h1>
          <Button asChild>
            <Link to="/explore">Back to Explore</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Image */}
      <section className="relative h-[60vh] overflow-hidden">
        <img 
          src={trip.image_url} 
          alt={trip.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        <div className="absolute top-6 left-6">
          <Button asChild variant="secondary" size="sm" className="bg-white/90 hover:bg-white">
            <Link to="/explore">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Explore
            </Link>
          </Button>
        </div>

        <div className="absolute bottom-8 left-8 text-white">
          <Badge variant="secondary" className="bg-white/90 text-primary mb-4">
            {trip.theme}
          </Badge>
          <h1 className="font-serif text-4xl md:text-5xl font-bold mb-2">
            {trip.title}
          </h1>
          <div className="flex items-center gap-4 text-lg">
            <div className="flex items-center">
              <MapPin className="mr-2 h-5 w-5" />
              {trip.destination}
            </div>
            <div className="flex items-center">
              <Star className="mr-1 h-5 w-5 text-yellow-400 fill-current" />
              {trip.rating}
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              <div>
                <h2 className="font-serif text-3xl font-bold mb-4">About This Adventure</h2>
                <p className="font-sans text-lg text-muted-foreground leading-relaxed">
                  {trip.description}
                </p>
              </div>

              {/* What's Included */}
              {trip.included_amenities && trip.included_amenities.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-serif text-2xl font-bold mb-4 flex items-center">
                      <CheckCircle className="mr-2 h-6 w-6 text-green-500" />
                      What's Included
                    </h3>
                    <ul className="space-y-2">
                      {trip.included_amenities.map((item, index) => (
                        <li key={index} className="flex items-center font-sans">
                          <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* What's Not Included */}
              {trip.excluded_items && trip.excluded_items.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-serif text-2xl font-bold mb-4 flex items-center">
                      <XCircle className="mr-2 h-6 w-6 text-red-500" />
                      What's Not Included
                    </h3>
                    <ul className="space-y-2">
                      {trip.excluded_items.map((item, index) => (
                        <li key={index} className="flex items-center font-sans">
                          <XCircle className="mr-2 h-4 w-4 text-red-500" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Requirements */}
              {trip.requirements && trip.requirements.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-serif text-2xl font-bold mb-4 flex items-center">
                      <AlertCircle className="mr-2 h-6 w-6 text-yellow-500" />
                      Requirements
                    </h3>
                    <ul className="space-y-2">
                      {trip.requirements.map((item, index) => (
                        <li key={index} className="flex items-center font-sans">
                          <AlertCircle className="mr-2 h-4 w-4 text-yellow-500" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Day-by-Day Program */}
              {trip.program && trip.program.length > 0 && (
                <div>
                  <h2 className="font-serif text-3xl font-bold mb-6">Day-by-Day Itinerary</h2>
                  <div className="space-y-6">
                    {trip.program.map((day, index) => (
                      <Card key={index} className="overflow-hidden">
                        <CardContent className="p-6">
                          <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0">
                              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                                {day.day}
                              </div>
                            </div>
                            <div className="flex-1">
                              <h3 className="font-serif text-xl font-bold mb-2">
                                Day {day.day}: {day.location}
                              </h3>
                              <p className="font-sans text-muted-foreground leading-relaxed">
                                {day.activities}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Trip Map */}
              {trip.program && trip.program.length > 0 && (
                <div>
                  <h2 className="font-serif text-3xl font-bold mb-6">Trip Locations</h2>
                  <TripItineraryMap 
                    program={trip.program} 
                    tripTitle={trip.title}
                    className="w-full"
                  />
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Booking Card */}
              <Card className="sticky top-6">
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <div className="text-3xl font-bold text-primary">{trip.price}</div>
                    <div className="text-sm text-muted-foreground">per person</div>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div className="flex items-center justify-between font-sans">
                      <div className="flex items-center">
                        <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Dates</span>
                      </div>
                      <span className="text-sm font-medium">{trip.dates}</span>
                    </div>

                    <div className="flex items-center justify-between font-sans">
                      <div className="flex items-center">
                        <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Group Size</span>
                      </div>
                      <span className="text-sm font-medium">{trip.group_size}</span>
                    </div>

                    <div className="flex items-center justify-between font-sans">
                      <div className="flex items-center">
                        <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Duration</span>
                      </div>
                      <span className="text-sm font-medium">{trip.duration_days} days</span>
                    </div>

                    <div className="flex items-center justify-between font-sans">
                      <span className="text-sm">Difficulty</span>
                      <Badge variant={
                        trip.difficulty_level === 'Easy' ? 'secondary' :
                        trip.difficulty_level === 'Moderate' ? 'default' : 'destructive'
                      }>
                        {trip.difficulty_level}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between font-sans">
                      <span className="text-sm">Sensei</span>
                      <div className="text-right">
                        <span className="text-sm font-medium block">{trip.sensei_name}</span>
                        {senseiProfile && (
                          <span className="text-xs text-muted-foreground">
                            {senseiProfile.specialty} • {senseiProfile.trips_led} trips led
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between font-sans">
                      <span className="text-sm">Availability</span>
                      <span className="text-sm font-medium">
                        {trip.current_participants}/{trip.max_participants} spots
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Button 
                      className="w-full font-sans font-medium" 
                      size="lg"
                      onClick={() => handleBookTrip(true)}
                      disabled={trip.current_participants >= trip.max_participants}
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      {trip.current_participants >= trip.max_participants ? 'Fully Booked' : `Book & Pay Now ${trip.price}`}
                    </Button>
                    
                    <Button 
                      variant="outline"
                      className="w-full font-sans font-medium" 
                      size="lg"
                      onClick={() => handleBookTrip(false)}
                      disabled={trip.current_participants >= trip.max_participants}
                    >
                      Reserve Now, Pay Later
                    </Button>
                  </div>

                  <div className="mt-4 text-center">
                    <Button variant="outline" className="w-full font-sans">
                      Contact for Custom Date
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Sensei Profile Card */}
              {senseiProfile && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-serif text-xl font-bold mb-4">Your Sensei</h3>
                    <div className="flex items-start space-x-4">
                      {senseiProfile.image_url && (
                        <img 
                          src={senseiProfile.image_url} 
                          alt={senseiProfile.name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="font-sans font-semibold text-lg">{senseiProfile.name}</h4>
                        <p className="text-sm text-muted-foreground mb-2">{senseiProfile.specialty}</p>
                        <p className="text-sm font-sans leading-relaxed mb-3">
                          {senseiProfile.bio.substring(0, 200)}...
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center">
                            <Star className="mr-1 h-3 w-3 text-yellow-400 fill-current" />
                            {senseiProfile.rating}
                          </div>
                          <span>{senseiProfile.trips_led} trips led</span>
                          <span>{senseiProfile.location}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Booking Dialog */}
      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Book Your Adventure</DialogTitle>
            <DialogDescription>
              Complete your booking for {trip?.title}. We'll create your customer account and dashboard.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={bookingForm.full_name}
                  onChange={(e) => setBookingForm(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Enter your full name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  value={bookingForm.phone}
                  onChange={(e) => setBookingForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter your phone number"
                  required
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={bookingForm.email}
                onChange={(e) => setBookingForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter your email address"
                required
                disabled
              />
            </div>
            
            <div>
              <Label htmlFor="address">Address *</Label>
              <Textarea
                id="address"
                value={bookingForm.address}
                onChange={(e) => setBookingForm(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Enter your full address"
                rows={3}
                required
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowBookingDialog(false)}
              disabled={bookingLoading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleBookingSubmit}
              disabled={bookingLoading || !bookingForm.full_name || !bookingForm.phone || !bookingForm.email || !bookingForm.address}
            >
              {bookingLoading 
                ? "Processing..." 
                : bookingForm.payNow 
                  ? `Pay Now ${trip?.price}` 
                  : "Reserve My Spot"
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TripDetail;