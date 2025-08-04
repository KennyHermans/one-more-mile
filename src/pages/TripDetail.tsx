import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Navigation } from "@/components/ui/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  CreditCard,
  Heart,
  Share2,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  Award,
  Shield
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
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
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


  const handlePaymentOption = async (planType: string, fullPayment = false) => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to create an account to book a trip.",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    if (!trip) return;

    setPaymentLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-payment-plan', {
        body: {
          tripId: trip.id,
          planType,
          fullPayment
        }
      });

      if (error) throw error;

      if (data.url) {
        // Open Stripe checkout in a new tab
        window.open(data.url, '_blank');
        toast({
          title: "Redirecting to payment",
          description: "Please complete your payment in the new tab",
        });
      }
    } catch (error: any) {
      toast({
        title: "Payment setup failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleReserveNowPayLater = async () => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to create an account to reserve a trip.",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    if (!trip) return;

    setPaymentLoading(true);
    try {
      // Calculate payment deadline (3 months from now)
      const paymentDeadline = new Date();
      paymentDeadline.setMonth(paymentDeadline.getMonth() + 3);

      // Create booking without immediate payment
      const { data, error } = await supabase
        .from('trip_bookings')
        .insert({
          trip_id: trip.id,
          user_id: user.id,
          booking_status: 'reserved',
          payment_status: 'pending',
          payment_deadline: paymentDeadline.toISOString(),
          total_amount: parseFloat(trip.price.replace(/[^0-9.]/g, ''))
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Reservation confirmed!",
        description: `Your spot is reserved until ${paymentDeadline.toLocaleDateString()}. Please complete payment before the deadline.`,
      });

      setShowPaymentOptions(false);
    } catch (error: any) {
      toast({
        title: "Reservation failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPaymentLoading(false);
    }
  };

  const calculateInstallmentBreakdown = (planType: string) => {
    if (!trip) return null;
    
    const priceString = trip.price.replace(/[^0-9.]/g, '');
    const totalAmount = parseFloat(priceString);
    
    if (planType === "deposit_1000") {
      const depositAmount = 1000;
      const remainingAmount = totalAmount - depositAmount;
      return {
        deposit: depositAmount,
        installment: remainingAmount,
        count: 1
      };
    }
    
    return null;
  };

  const handleBookTrip = () => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to create an account to book a trip.",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }
    setShowPaymentOptions(!showPaymentOptions);
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

        <div className="absolute top-6 right-6 flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="bg-white/90 hover:bg-white"
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: trip.title,
                  text: trip.description,
                  url: window.location.href,
                });
              } else {
                navigator.clipboard.writeText(window.location.href);
                toast({
                  title: "Link copied!",
                  description: "Trip link copied to clipboard",
                });
              }
            }}
          >
            <Share2 className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className={`bg-white/90 hover:bg-white ${isWishlisted ? 'text-red-500' : ''}`}
            onClick={() => {
              setIsWishlisted(!isWishlisted);
              toast({
                title: isWishlisted ? "Removed from wishlist" : "Added to wishlist",
                description: isWishlisted ? "Trip removed from your wishlist" : "Trip saved to your wishlist",
              });
            }}
          >
            <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-current' : ''}`} />
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

              {/* Interactive Content Tabs */}
              <Tabs defaultValue="itinerary" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="itinerary">Itinerary</TabsTrigger>
                  <TabsTrigger value="included">What's Included</TabsTrigger>
                  <TabsTrigger value="requirements">Requirements</TabsTrigger>
                  <TabsTrigger value="map">Map View</TabsTrigger>
                </TabsList>

                <TabsContent value="itinerary" className="mt-6">
                  {trip.program && trip.program.length > 0 ? (
                    <div className="space-y-4">
                      {trip.program.map((day, index) => (
                        <Collapsible
                          key={index}
                          open={expandedDay === day.day}
                          onOpenChange={() => setExpandedDay(expandedDay === day.day ? null : day.day)}
                        >
                          <CollapsibleTrigger asChild>
                            <Card className="cursor-pointer hover:shadow-md transition-all duration-200">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-4">
                                    <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                                      {day.day}
                                    </div>
                                    <div>
                                      <h3 className="font-serif text-lg font-bold">
                                        Day {day.day}: {day.location}
                                      </h3>
                                       <p className="text-sm text-muted-foreground">
                                         {String(day.activities || '').substring(0, 100)}...
                                       </p>
                                    </div>
                                  </div>
                                  {expandedDay === day.day ? 
                                    <ChevronUp className="h-5 w-5" /> : 
                                    <ChevronDown className="h-5 w-5" />
                                  }
                                </div>
                              </CardContent>
                            </Card>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-2">
                            <Card>
                              <CardContent className="p-6 bg-muted/50">
                                <h4 className="font-semibold mb-3">Full Day Activities</h4>
                                <p className="font-sans text-muted-foreground leading-relaxed">
                                  {day.activities}
                                </p>
                              </CardContent>
                            </Card>
                          </CollapsibleContent>
                        </Collapsible>
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="p-6 text-center">
                        <p className="text-muted-foreground">Detailed itinerary coming soon!</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="included" className="mt-6">
                  <div className="grid gap-6">
                    {trip.included_amenities && trip.included_amenities.length > 0 && (
                      <Card>
                        <CardContent className="p-6">
                          <h3 className="font-serif text-xl font-bold mb-4 flex items-center">
                            <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                            What's Included
                          </h3>
                          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {trip.included_amenities.map((item, index) => (
                              <li key={index} className="flex items-center font-sans">
                                <CheckCircle className="mr-2 h-4 w-4 text-green-500 flex-shrink-0" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {trip.excluded_items && trip.excluded_items.length > 0 && (
                      <Card>
                        <CardContent className="p-6">
                          <h3 className="font-serif text-xl font-bold mb-4 flex items-center">
                            <XCircle className="mr-2 h-5 w-5 text-red-500" />
                            What's Not Included
                          </h3>
                          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {trip.excluded_items.map((item, index) => (
                              <li key={index} className="flex items-center font-sans">
                                <XCircle className="mr-2 h-4 w-4 text-red-500 flex-shrink-0" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="requirements" className="mt-6">
                  {trip.requirements && trip.requirements.length > 0 ? (
                    <Card>
                      <CardContent className="p-6">
                        <h3 className="font-serif text-xl font-bold mb-4 flex items-center">
                          <AlertCircle className="mr-2 h-5 w-5 text-yellow-500" />
                          Requirements & Prerequisites
                        </h3>
                        <ul className="space-y-3">
                          {trip.requirements.map((item, index) => (
                            <li key={index} className="flex items-start font-sans">
                              <AlertCircle className="mr-2 h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                          <div className="flex items-start">
                            <Shield className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                            <div>
                              <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">Important Note</h4>
                              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                                Please ensure you meet all requirements before booking. Our team will verify your qualifications during the booking process.
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="p-6 text-center">
                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                        <h3 className="font-semibold mb-2">No Special Requirements</h3>
                        <p className="text-muted-foreground">This trip is suitable for all experience levels!</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="map" className="mt-6">
                  {trip.program && trip.program.length > 0 ? (
                    <div>
                      <div className="mb-4">
                        <h3 className="font-serif text-xl font-bold mb-2">Trip Locations</h3>
                        <p className="text-muted-foreground">Explore the route and key destinations of your adventure</p>
                      </div>
                      <TripItineraryMap 
                        program={trip.program} 
                        tripTitle={trip.title}
                        className="w-full"
                      />
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="p-6 text-center">
                        <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-semibold mb-2">Map Coming Soon</h3>
                        <p className="text-muted-foreground">Detailed location map will be available once the itinerary is finalized.</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
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
                        {trip.sensei_id ? (
                          <>
                            <span className="text-sm font-medium block">{trip.sensei_name}</span>
                            {senseiProfile && (
                              <span className="text-xs text-muted-foreground">
                                {senseiProfile.specialty} • {senseiProfile.trips_led} trips led
                              </span>
                            )}
                          </>
                        ) : (
                          <div className="flex flex-col items-end">
                            <span className="text-sm font-medium text-yellow-600">No sensei assigned</span>
                            <span className="text-xs text-muted-foreground">
                              Senseis can apply to lead this trip
                            </span>
                          </div>
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
                      onClick={handleBookTrip}
                      disabled={trip.current_participants >= trip.max_participants}
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      {trip.current_participants >= trip.max_participants ? 'Fully Booked' : 'Book This Trip'}
                    </Button>

                    <Button 
                      variant="outline"
                      className="w-full font-sans font-medium border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white" 
                      size="lg"
                      onClick={handleReserveNowPayLater}
                      disabled={trip.current_participants >= trip.max_participants || paymentLoading}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      Reserve Now, Pay Later
                    </Button>

                    {/* Payment Options - Show when user clicks Book This Trip */}
                    {showPaymentOptions && (
                      <div className="space-y-3 pt-4 border-t">
                        <h4 className="font-semibold text-center text-sm">Choose Payment Option</h4>
                        
                        {/* Pay in Full Option */}
                        <Card className="border-2 border-primary/20 hover:border-primary/40 transition-colors cursor-pointer"
                              onClick={() => handlePaymentOption("", true)}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                                  <CreditCard className="h-4 w-4" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-sm">Pay in Full</h3>
                                  <p className="text-xs text-muted-foreground">Complete payment now</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-primary">{trip.price}</div>
                                <Badge variant="secondary" className="text-xs">Best Value</Badge>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              ✓ Instant confirmation ✓ No additional fees
                            </p>
                          </CardContent>
                        </Card>

                        {/* Deposit Option */}
                        {(() => {
                          const breakdown = calculateInstallmentBreakdown("deposit_1000");
                          return breakdown ? (
                            <Card className="border hover:border-primary/40 transition-colors cursor-pointer"
                                  onClick={() => handlePaymentOption("deposit_1000")}>
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-secondary text-secondary-foreground rounded-full flex items-center justify-center">
                                      <Clock className="h-4 w-4" />
                                    </div>
                                    <div>
                                      <h3 className="font-semibold text-sm">Pay with Deposit</h3>
                                      <p className="text-xs text-muted-foreground">€1,000 now + rest later</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm font-bold">€1,000</div>
                                    <div className="text-xs text-muted-foreground">then €{breakdown.installment}</div>
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                  ✓ Secure spot with €1,000 ✓ Pay balance after 1 month
                                </p>
                              </CardContent>
                            </Card>
                          ) : null;
                        })()}
                      </div>
                    )}
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

    </div>
  );
};

export default TripDetail;