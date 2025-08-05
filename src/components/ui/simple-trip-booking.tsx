import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { 
  Users,
  Calendar,
  MapPin,
  DollarSign,
  CreditCard,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';

interface SimpleTripBookingProps {
  tripId: string;
  onComplete?: (bookingData: any) => void;
  onCancel?: () => void;
  className?: string;
}

interface BookingData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  participants: number;
  specialRequests: string;
  paymentPlan: 'full' | 'deposit';
  agreedToTerms: boolean;
}

export function SimpleTripBooking({ tripId, onComplete, onCancel, className }: SimpleTripBookingProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [tripDetails, setTripDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const [bookingData, setBookingData] = useState<BookingData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    participants: 1,
    specialRequests: '',
    paymentPlan: 'deposit',
    agreedToTerms: false
  });

  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    fetchTripDetails();
  }, [tripId]);

  const fetchTripDetails = async () => {
    try {
      const { data: trip, error } = await supabase
        .from('trips')
        .select(`
          *,
          sensei_profiles!sensei_id (
            name,
            image_url
          )
        `)
        .eq('id', tripId)
        .single();

      if (error) throw error;
      setTripDetails(trip);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load trip details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const validateStep1 = (): string[] => {
    const errors: string[] = [];
    if (!bookingData.firstName.trim()) errors.push('First name is required');
    if (!bookingData.lastName.trim()) errors.push('Last name is required');
    if (!bookingData.email.trim()) errors.push('Email is required');
    if (!bookingData.phone.trim()) errors.push('Phone is required');
    if (bookingData.participants < 1) errors.push('At least one participant required');
    return errors;
  };

  const validateStep2 = (): string[] => {
    const errors: string[] = [];
    if (!bookingData.agreedToTerms) errors.push('You must agree to terms and conditions');
    return errors;
  };

  const goToNextStep = () => {
    const stepErrors = currentStep === 1 ? validateStep1() : [];
    setErrors(stepErrors);
    
    if (stepErrors.length === 0) {
      setCurrentStep(2);
    } else {
      toast({
        title: "Please complete required fields",
        description: `${stepErrors.length} issue(s) need to be resolved`,
        variant: "destructive",
      });
    }
  };

  const submitBooking = async () => {
    const stepErrors = validateStep2();
    setErrors(stepErrors);
    
    if (stepErrors.length > 0) {
      toast({
        title: "Cannot complete booking",
        description: "Please resolve all issues before submitting",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from('trip_bookings').insert({
        trip_id: tripId,
        user_id: user?.id,
        total_amount: tripDetails?.price ? parseFloat(tripDetails.price) : 0,
        payment_status: 'pending',
        booking_status: 'pending',
        notes: `Participants: ${bookingData.participants}, Payment: ${bookingData.paymentPlan}, Requests: ${bookingData.specialRequests}`
      });

      if (error) throw error;

      toast({
        title: "Booking Submitted!",
        description: "Your booking has been submitted successfully. You'll receive a confirmation email shortly.",
      });

      if (onComplete) {
        onComplete(bookingData);
      }
    } catch (error: any) {
      toast({
        title: "Booking Failed",
        description: "There was an error submitting your booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center">Loading trip details...</div>
        </CardContent>
      </Card>
    );
  }

  if (!tripDetails) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-destructive">Failed to load trip details</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Book Your Adventure
          <span className="text-sm font-normal text-muted-foreground">
            (Step {currentStep} of 2)
          </span>
        </CardTitle>
        <CardDescription>
          {tripDetails.title} • {tripDetails.destination}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Trip Summary */}
        <div className="p-4 bg-muted rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {tripDetails.destination}
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {tripDetails.dates}
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              ${tripDetails.price}
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {tripDetails.sensei_profiles?.name}
            </div>
          </div>
        </div>

        {currentStep === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Your Details</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={bookingData.firstName}
                  onChange={(e) => setBookingData(prev => ({ ...prev, firstName: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={bookingData.lastName}
                  onChange={(e) => setBookingData(prev => ({ ...prev, lastName: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={bookingData.email}
                  onChange={(e) => setBookingData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={bookingData.phone}
                  onChange={(e) => setBookingData(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="participants">Number of Participants</Label>
              <Select value={bookingData.participants.toString()} onValueChange={(value) => setBookingData(prev => ({ ...prev, participants: parseInt(value) }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                    <SelectItem key={num} value={num.toString()}>{num} {num === 1 ? 'person' : 'people'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="specialRequests">Special Requests (Optional)</Label>
              <Textarea
                id="specialRequests"
                placeholder="Any dietary requirements, accessibility needs, or special requests..."
                value={bookingData.specialRequests}
                onChange={(e) => setBookingData(prev => ({ ...prev, specialRequests: e.target.value }))}
              />
            </div>

            {errors.length > 0 && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <ul className="text-sm text-destructive">
                  {errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Payment & Confirmation</h3>
            
            <div>
              <Label>Payment Option</Label>
              <Select value={bookingData.paymentPlan} onValueChange={(value: 'full' | 'deposit') => setBookingData(prev => ({ ...prev, paymentPlan: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">Pay Deposit (30%) - ${Math.round(parseFloat(tripDetails.price) * 0.3)}</SelectItem>
                  <SelectItem value="full">Pay Full Amount - ${tripDetails.price}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Booking Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Trip:</span>
                  <span>{tripDetails.title}</span>
                </div>
                <div className="flex justify-between">
                  <span>Participants:</span>
                  <span>{bookingData.participants}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Cost:</span>
                  <span>${parseFloat(tripDetails.price) * bookingData.participants}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Amount Due:</span>
                  <span>
                    ${bookingData.paymentPlan === 'full' 
                      ? parseFloat(tripDetails.price) * bookingData.participants
                      : Math.round(parseFloat(tripDetails.price) * bookingData.participants * 0.3)
                    }
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="terms"
                checked={bookingData.agreedToTerms}
                onCheckedChange={(checked) => setBookingData(prev => ({ ...prev, agreedToTerms: !!checked }))}
              />
              <Label htmlFor="terms" className="text-sm">
                I agree to the Terms and Conditions and Privacy Policy
              </Label>
            </div>

            {errors.length > 0 && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <ul className="text-sm text-destructive">
                  {errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <div>
            {currentStep === 2 && (
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
            {onCancel && (
              <Button variant="ghost" onClick={onCancel} className="ml-2">
                Cancel
              </Button>
            )}
          </div>
          
          <div>
            {currentStep === 1 && (
              <Button onClick={goToNextStep}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
            {currentStep === 2 && (
              <Button onClick={submitBooking} disabled={submitting}>
                <CreditCard className="h-4 w-4 mr-2" />
                {submitting ? 'Processing...' : 'Complete Booking'}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}