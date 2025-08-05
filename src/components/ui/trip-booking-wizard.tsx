import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ChevronRight, 
  ChevronLeft,
  Users,
  Calendar,
  MapPin,
  DollarSign,
  CreditCard,
  CheckCircle,
  Clock,
  AlertTriangle,
  Info,
  Star,
  Shield,
  Plane,
  Bed,
  Utensils,
  Camera,
  Heart,
  FileText,
  Phone,
  Mail,
  Globe,
  Save,
  Zap,
  RotateCcw
} from 'lucide-react';

interface BookingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  required: boolean;
}

interface TravelerInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  passportNumber: string;
  nationality: string;
  dietaryRequirements: string;
  medicalConditions: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  isMainBooker: boolean;
}

interface BookingData {
  tripId: string;
  tripTitle: string;
  tripDestination: string;
  tripDates: string;
  tripPrice: number;
  senseiName: string;
  senseiAvatar?: string;
  participants: TravelerInfo[];
  roomingPreferences: string;
  specialRequests: string;
  insuranceOption: string;
  paymentPlan: 'full' | 'deposit' | 'installments';
  totalAmount: number;
  depositAmount: number;
  agreedToTerms: boolean;
  marketingOptIn: boolean;
}

interface TripBookingWizardProps {
  tripId: string;
  onComplete?: (bookingData: BookingData) => void;
  onCancel?: () => void;
  className?: string;
}

export function TripBookingWizard({ tripId, onComplete, onCancel, className }: TripBookingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [tripDetails, setTripDetails] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isReturningCustomer, setIsReturningCustomer] = useState(false);
  const [quickBookingMode, setQuickBookingMode] = useState(false);
  const [progressSaved, setProgressSaved] = useState(false);
  const [availabilityInfo, setAvailabilityInfo] = useState<{ spotsLeft: number; isAvailable: boolean }>({ spotsLeft: 0, isAvailable: false });
  
  const [bookingData, setBookingData] = useState<BookingData>({
    tripId,
    tripTitle: '',
    tripDestination: '',
    tripDates: '',
    tripPrice: 0,
    senseiName: '',
    participants: [{
      id: 'main',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      passportNumber: '',
      nationality: '',
      dietaryRequirements: '',
      medicalConditions: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      isMainBooker: true
    }],
    roomingPreferences: '',
    specialRequests: '',
    insuranceOption: 'none',
    paymentPlan: 'deposit',
    totalAmount: 0,
    depositAmount: 0,
    agreedToTerms: false,
    marketingOptIn: false
  });
  
  const [loading, setLoading] = useState(true);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const steps: BookingStep[] = [
    {
      id: 'trip-details',
      title: 'Trip Overview',
      description: 'Review trip details and requirements',
      completed: false,
      required: true
    },
    {
      id: 'participants',
      title: 'Traveler Information',
      description: 'Add participant details',
      completed: false,
      required: true
    },
    {
      id: 'preferences',
      title: 'Preferences & Requirements',
      description: 'Rooming and special requests',
      completed: false,
      required: false
    },
    {
      id: 'insurance',
      title: 'Travel Insurance',
      description: 'Optional travel protection',
      completed: false,
      required: false
    },
    {
      id: 'payment',
      title: 'Payment Options',
      description: 'Choose your payment plan',
      completed: false,
      required: true
    },
    {
      id: 'confirmation',
      title: 'Review & Confirm',
      description: 'Final review before booking',
      completed: false,
      required: true
    }
  ];

  // Progress persistence using localStorage
  const saveProgress = useCallback(() => {
    const progressData = {
      currentStep,
      bookingData,
      timestamp: Date.now()
    };
    localStorage.setItem(`booking-progress-${tripId}`, JSON.stringify(progressData));
    setProgressSaved(true);
    setTimeout(() => setProgressSaved(false), 2000);
  }, [currentStep, bookingData, tripId]);

  const loadProgress = useCallback(() => {
    const saved = localStorage.getItem(`booking-progress-${tripId}`);
    if (saved) {
      try {
        const progressData = JSON.parse(saved);
        // Only restore if less than 24 hours old
        if (Date.now() - progressData.timestamp < 24 * 60 * 60 * 1000) {
          setCurrentStep(progressData.currentStep);
          setBookingData(progressData.bookingData);
          toast({
            title: "Progress Restored",
            description: "Your previous booking progress has been restored.",
          });
        }
      } catch (error) {
        console.error('Failed to load booking progress:', error);
      }
    }
  }, [tripId, toast]);

  const clearProgress = useCallback(() => {
    localStorage.removeItem(`booking-progress-${tripId}`);
  }, [tripId]);

  // Load user profile for smart defaults
  const loadUserProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Check if user is returning customer
        const { data: bookings } = await supabase
          .from('trip_bookings')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);
        
        setIsReturningCustomer(bookings && bookings.length > 0);

        // Load customer profile for smart defaults
        const { data: profile } = await supabase
          .from('customer_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (profile) {
          setUserProfile(profile);
          // Apply smart defaults to main booker
          setBookingData(prev => ({
            ...prev,
            participants: prev.participants.map(p => 
              p.isMainBooker ? {
                ...p,
                firstName: profile.full_name?.split(' ')[0] || '',
                lastName: profile.full_name?.split(' ').slice(1).join(' ') || '',
                phone: profile.phone || '',
                dietaryRequirements: profile.dietary_restrictions || '',
                medicalConditions: profile.medical_conditions || '',
                emergencyContactName: profile.emergency_contact_name || '',
                emergencyContactPhone: profile.emergency_contact_phone || '',
                email: user.email || ''
              } : p
            )
          }));
        }
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  }, []);

  // Real-time availability checking
  const checkAvailability = useCallback(async () => {
    try {
      const { data: trip } = await supabase
        .from('trips')
        .select('current_participants, max_participants')
        .eq('id', tripId)
        .single();

      if (trip) {
        const spotsLeft = trip.max_participants - (trip.current_participants || 0);
        setAvailabilityInfo({
          spotsLeft,
          isAvailable: spotsLeft > 0
        });
      }
    } catch (error) {
      console.error('Failed to check availability:', error);
    }
  }, [tripId]);

  useEffect(() => {
    fetchTripDetails();
    loadUserProfile();
    loadProgress();
    checkAvailability();
    
    // Set up real-time availability checking
    const interval = setInterval(checkAvailability, 30000); // Check every 30 seconds
    
    return () => {
      clearInterval(interval);
    };
  }, [tripId, loadUserProfile, loadProgress, checkAvailability]);

  // Auto-save progress when booking data changes
  useEffect(() => {
    if (tripDetails) { // Only save after initial load
      const debounceTimer = setTimeout(saveProgress, 1000);
      return () => clearTimeout(debounceTimer);
    }
  }, [bookingData, currentStep, saveProgress, tripDetails]);

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
      setBookingData(prev => ({
        ...prev,
        tripTitle: trip.title,
        tripDestination: trip.destination,
        tripDates: trip.dates,
        tripPrice: parseFloat(trip.price) || 0,
        senseiName: trip.sensei_profiles?.name || trip.sensei_name,
        senseiAvatar: trip.sensei_profiles?.image_url,
        totalAmount: parseFloat(trip.price) || 0,
        depositAmount: Math.round((parseFloat(trip.price) || 0) * 0.3)
      }));
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

  const validateCurrentStep = (): string[] => {
    const errors: string[] = [];
    const quickBookingSteps = [
      { id: 'trip-details', title: 'Trip Overview', required: true },
      { id: 'participants', title: 'Quick Info', required: true },
      { id: 'payment', title: 'Payment', required: true }
    ];
    const currentSteps = quickBookingMode ? quickBookingSteps : steps;
    const currentStepId = currentSteps[currentStep].id;
    
    switch (currentStepId) {
      case 'participants':
        bookingData.participants.forEach((participant, index) => {
          if (!participant.firstName.trim()) errors.push(`Participant ${index + 1}: First name required`);
          if (!participant.lastName.trim()) errors.push(`Participant ${index + 1}: Last name required`);
          if (!participant.email.trim()) errors.push(`Participant ${index + 1}: Email required`);
          if (!participant.phone.trim()) errors.push(`Participant ${index + 1}: Phone required`);
          if (!participant.dateOfBirth) errors.push(`Participant ${index + 1}: Date of birth required`);
          if (participant.isMainBooker && !quickBookingMode) {
            if (!participant.emergencyContactName.trim()) errors.push('Emergency contact name required');
            if (!participant.emergencyContactPhone.trim()) errors.push('Emergency contact phone required');
          }
        });
        break;
        
      case 'payment':
        if (!bookingData.paymentPlan) errors.push('Payment plan selection required');
        break;
        
      case 'confirmation':
        if (!bookingData.agreedToTerms) errors.push('Terms and conditions agreement required');
        break;
    }
    
    return errors;
  };

  const addParticipant = () => {
    const newParticipant: TravelerInfo = {
      id: `participant-${Date.now()}`,
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      passportNumber: '',
      nationality: '',
      dietaryRequirements: '',
      medicalConditions: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      isMainBooker: false
    };
    
    setBookingData(prev => ({
      ...prev,
      participants: [...prev.participants, newParticipant]
    }));
  };

  const removeParticipant = (participantId: string) => {
    if (bookingData.participants.length > 1) {
      setBookingData(prev => ({
        ...prev,
        participants: prev.participants.filter(p => p.id !== participantId)
      }));
    }
  };

  const updateParticipant = (participantId: string, updates: Partial<TravelerInfo>) => {
    setBookingData(prev => ({
      ...prev,
      participants: prev.participants.map(p =>
        p.id === participantId ? { ...p, ...updates } : p
      )
    }));
  };

  const goToNextStep = () => {
    const errors = validateCurrentStep();
    setValidationErrors(errors);
    
    if (errors.length > 0) {
      toast({
        title: "Please complete required fields",
        description: `${errors.length} issue(s) need to be resolved`,
        variant: "destructive",
      });
      return;
    }
    
    const quickBookingSteps = [
      { id: 'trip-details', title: 'Trip Overview', required: true },
      { id: 'participants', title: 'Quick Info', required: true },
      { id: 'payment', title: 'Payment', required: true }
    ];
    const currentSteps = quickBookingMode ? quickBookingSteps : steps;
    if (currentStep < currentSteps.length - 1) {
      setCurrentStep(currentStep + 1);
      setValidationErrors([]);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setValidationErrors([]);
    }
  };

  const submitBooking = async () => {
    const errors = validateCurrentStep();
    if (errors.length > 0) {
      setValidationErrors(errors);
      toast({
        title: "Cannot complete booking",
        description: "Please resolve all issues before submitting",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      // Submit booking to database
      const { error } = await supabase.from('trip_bookings').insert({
        trip_id: tripId,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        total_amount: bookingData.totalAmount,
        payment_status: bookingData.paymentPlan === 'full' ? 'pending' : 'pending',
        booking_status: 'pending',
        notes: `Participants: ${bookingData.participants.length}, Insurance: ${bookingData.insuranceOption}, Payment: ${bookingData.paymentPlan}`
      });

      if (error) throw error;

      if (onComplete) {
        onComplete(bookingData);
      }

      toast({
        title: "Booking Submitted!",
        description: "Your booking has been submitted successfully. You'll receive a confirmation email shortly.",
      });
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

  const renderStepContent = () => {
    const quickBookingSteps = [
      { id: 'trip-details', title: 'Trip Overview', required: true },
      { id: 'participants', title: 'Quick Info', required: true },
      { id: 'payment', title: 'Payment', required: true }
    ];
    const currentSteps = quickBookingMode ? quickBookingSteps : steps;
    const currentStepId = currentSteps[currentStep].id;
    
    switch (currentStepId) {
      case 'trip-details':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={bookingData.senseiAvatar} />
                    <AvatarFallback>
                      {bookingData.senseiName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-xl">{bookingData.tripTitle}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <MapPin className="h-4 w-4" />
                      {bookingData.tripDestination}
                    </CardDescription>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {bookingData.tripDates}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        Guide: {bookingData.senseiName}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                    <DollarSign className="h-8 w-8 text-blue-600" />
                    <div>
                      <div className="font-semibold">${bookingData.tripPrice}</div>
                      <div className="text-sm text-muted-foreground">per person</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                    <div>
                      <div className="font-semibold">Available</div>
                      <div className="text-sm text-muted-foreground">Spots remaining</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg">
                    <Star className="h-8 w-8 text-purple-600" />
                    <div>
                      <div className="font-semibold">{tripDetails?.rating || 4.8}</div>
                      <div className="text-sm text-muted-foreground">Rating</div>
                    </div>
                  </div>
                </div>
                
                {tripDetails?.description && (
                  <div className="mt-6">
                    <h4 className="font-semibold mb-2">Trip Description</h4>
                    <p className="text-muted-foreground">{tripDetails.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case 'participants':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Traveler Information</h3>
              <Button onClick={addParticipant} variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Add Traveler
              </Button>
            </div>

            {bookingData.participants.map((participant, index) => (
              <Card key={participant.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {participant.isMainBooker ? 'Main Booker' : `Traveler ${index + 1}`}
                    </CardTitle>
                    {!participant.isMainBooker && bookingData.participants.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeParticipant(participant.id)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`firstName-${participant.id}`}>First Name *</Label>
                      <Input
                        id={`firstName-${participant.id}`}
                        value={participant.firstName}
                        onChange={(e) => updateParticipant(participant.id, { firstName: e.target.value })}
                        placeholder="Enter first name"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`lastName-${participant.id}`}>Last Name *</Label>
                      <Input
                        id={`lastName-${participant.id}`}
                        value={participant.lastName}
                        onChange={(e) => updateParticipant(participant.id, { lastName: e.target.value })}
                        placeholder="Enter last name"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`email-${participant.id}`}>Email *</Label>
                      <Input
                        id={`email-${participant.id}`}
                        type="email"
                        value={participant.email}
                        onChange={(e) => updateParticipant(participant.id, { email: e.target.value })}
                        placeholder="Enter email address"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`phone-${participant.id}`}>Phone *</Label>
                      <Input
                        id={`phone-${participant.id}`}
                        value={participant.phone}
                        onChange={(e) => updateParticipant(participant.id, { phone: e.target.value })}
                        placeholder="Enter phone number"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`dob-${participant.id}`}>Date of Birth *</Label>
                      <Input
                        id={`dob-${participant.id}`}
                        type="date"
                        value={participant.dateOfBirth}
                        onChange={(e) => updateParticipant(participant.id, { dateOfBirth: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`nationality-${participant.id}`}>Nationality</Label>
                      <Input
                        id={`nationality-${participant.id}`}
                        value={participant.nationality}
                        onChange={(e) => updateParticipant(participant.id, { nationality: e.target.value })}
                        placeholder="Enter nationality"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`passport-${participant.id}`}>Passport Number</Label>
                      <Input
                        id={`passport-${participant.id}`}
                        value={participant.passportNumber}
                        onChange={(e) => updateParticipant(participant.id, { passportNumber: e.target.value })}
                        placeholder="Enter passport number"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`dietary-${participant.id}`}>Dietary Requirements</Label>
                      <Input
                        id={`dietary-${participant.id}`}
                        value={participant.dietaryRequirements}
                        onChange={(e) => updateParticipant(participant.id, { dietaryRequirements: e.target.value })}
                        placeholder="Any dietary restrictions"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <Label htmlFor={`medical-${participant.id}`}>Medical Conditions</Label>
                    <Textarea
                      id={`medical-${participant.id}`}
                      value={participant.medicalConditions}
                      onChange={(e) => updateParticipant(participant.id, { medicalConditions: e.target.value })}
                      placeholder="Any medical conditions we should be aware of"
                      className="mt-1"
                    />
                  </div>

                  {participant.isMainBooker && (
                    <>
                      <Separator className="my-4" />
                      <h4 className="font-semibold mb-3">Emergency Contact</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`emergencyName-${participant.id}`}>Contact Name *</Label>
                          <Input
                            id={`emergencyName-${participant.id}`}
                            value={participant.emergencyContactName}
                            onChange={(e) => updateParticipant(participant.id, { emergencyContactName: e.target.value })}
                            placeholder="Emergency contact name"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`emergencyPhone-${participant.id}`}>Contact Phone *</Label>
                          <Input
                            id={`emergencyPhone-${participant.id}`}
                            value={participant.emergencyContactPhone}
                            onChange={(e) => updateParticipant(participant.id, { emergencyContactPhone: e.target.value })}
                            placeholder="Emergency contact phone"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case 'preferences':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Accommodation Preferences</CardTitle>
                <CardDescription>
                  Let us know your rooming preferences and any special requests
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="rooming">Rooming Preferences</Label>
                  <Select value={bookingData.roomingPreferences} onValueChange={(value) => setBookingData(prev => ({ ...prev, roomingPreferences: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select rooming preference" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single Room</SelectItem>
                      <SelectItem value="twin">Twin Room</SelectItem>
                      <SelectItem value="double">Double Room</SelectItem>
                      <SelectItem value="shared">Shared Room (budget option)</SelectItem>
                      <SelectItem value="no-preference">No Preference</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="special-requests">Special Requests</Label>
                  <Textarea
                    id="special-requests"
                    value={bookingData.specialRequests}
                    onChange={(e) => setBookingData(prev => ({ ...prev, specialRequests: e.target.value }))}
                    placeholder="Any special requests or requirements for your trip"
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'insurance':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Travel Insurance
                </CardTitle>
                <CardDescription>
                  Protect your investment with comprehensive travel insurance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div 
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        bookingData.insuranceOption === 'none' ? 'border-primary bg-primary/5' : 'border-gray-200'
                      }`}
                      onClick={() => setBookingData(prev => ({ ...prev, insuranceOption: 'none' }))}
                    >
                      <div className="font-semibold">No Insurance</div>
                      <div className="text-sm text-muted-foreground">I have my own coverage</div>
                      <div className="text-lg font-bold mt-2">$0</div>
                    </div>
                    
                    <div 
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        bookingData.insuranceOption === 'basic' ? 'border-primary bg-primary/5' : 'border-gray-200'
                      }`}
                      onClick={() => setBookingData(prev => ({ ...prev, insuranceOption: 'basic' }))}
                    >
                      <div className="font-semibold">Basic Coverage</div>
                      <div className="text-sm text-muted-foreground">Trip cancellation & medical</div>
                      <div className="text-lg font-bold mt-2">$99</div>
                    </div>
                    
                    <div 
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        bookingData.insuranceOption === 'comprehensive' ? 'border-primary bg-primary/5' : 'border-gray-200'
                      }`}
                      onClick={() => setBookingData(prev => ({ ...prev, insuranceOption: 'comprehensive' }))}
                    >
                      <div className="font-semibold">Comprehensive</div>
                      <div className="text-sm text-muted-foreground">Full protection package</div>
                      <div className="text-lg font-bold mt-2">$199</div>
                    </div>
                  </div>
                  
                  {bookingData.insuranceOption !== 'none' && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-blue-900 mb-2">Coverage Includes:</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Trip cancellation protection</li>
                        <li>• Emergency medical coverage</li>
                        <li>• Baggage protection</li>
                        {bookingData.insuranceOption === 'comprehensive' && (
                          <>
                            <li>• Flight delay compensation</li>
                            <li>• Adventure sports coverage</li>
                            <li>• Cancel for any reason option</li>
                          </>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'payment':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Options
                </CardTitle>
                <CardDescription>
                  Choose how you'd like to pay for your trip
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div 
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        bookingData.paymentPlan === 'full' ? 'border-primary bg-primary/5' : 'border-gray-200'
                      }`}
                      onClick={() => setBookingData(prev => ({ ...prev, paymentPlan: 'full' }))}
                    >
                      <div className="font-semibold">Pay in Full</div>
                      <div className="text-sm text-muted-foreground">Complete payment now</div>
                      <div className="text-lg font-bold mt-2">${bookingData.totalAmount}</div>
                      <Badge variant="secondary" className="mt-2">Save 5%</Badge>
                    </div>
                    
                    <div 
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        bookingData.paymentPlan === 'deposit' ? 'border-primary bg-primary/5' : 'border-gray-200'
                      }`}
                      onClick={() => setBookingData(prev => ({ ...prev, paymentPlan: 'deposit' }))}
                    >
                      <div className="font-semibold">Deposit</div>
                      <div className="text-sm text-muted-foreground">30% now, rest later</div>
                      <div className="text-lg font-bold mt-2">${bookingData.depositAmount}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Remaining: ${bookingData.totalAmount - bookingData.depositAmount}
                      </div>
                    </div>
                    
                    <div 
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        bookingData.paymentPlan === 'installments' ? 'border-primary bg-primary/5' : 'border-gray-200'
                      }`}
                      onClick={() => setBookingData(prev => ({ ...prev, paymentPlan: 'installments' }))}
                    >
                      <div className="font-semibold">Monthly Installments</div>
                      <div className="text-sm text-muted-foreground">Spread over 6 months</div>
                      <div className="text-lg font-bold mt-2">${Math.round(bookingData.totalAmount / 6)}/mo</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Starting today
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Payment Summary</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Trip cost ({bookingData.participants.length} travelers)</span>
                        <span>${bookingData.tripPrice * bookingData.participants.length}</span>
                      </div>
                      {bookingData.insuranceOption !== 'none' && (
                        <div className="flex justify-between">
                          <span>Travel insurance</span>
                          <span>${bookingData.insuranceOption === 'basic' ? 99 : 199}</span>
                        </div>
                      )}
                      <Separator className="my-2" />
                      <div className="flex justify-between font-semibold">
                        <span>Total Amount</span>
                        <span>${bookingData.totalAmount}</span>
                      </div>
                      {bookingData.paymentPlan === 'deposit' && (
                        <div className="flex justify-between text-blue-600">
                          <span>Due Today</span>
                          <span>${bookingData.depositAmount}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'confirmation':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Review Your Booking</CardTitle>
                <CardDescription>
                  Please review all details before confirming your booking
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">Trip Details</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="font-medium">{bookingData.tripTitle}</div>
                    <div className="text-sm text-muted-foreground">{bookingData.tripDestination}</div>
                    <div className="text-sm text-muted-foreground">{bookingData.tripDates}</div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Travelers ({bookingData.participants.length})</h4>
                  <div className="space-y-2">
                    {bookingData.participants.map((participant, index) => (
                      <div key={participant.id} className="bg-gray-50 p-3 rounded-lg">
                        <div className="font-medium">
                          {participant.firstName} {participant.lastName}
                          {participant.isMainBooker && <Badge variant="secondary" className="ml-2">Main Booker</Badge>}
                        </div>
                        <div className="text-sm text-muted-foreground">{participant.email}</div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Payment Plan</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between">
                      <span>Total Amount:</span>
                      <span className="font-semibold">${bookingData.totalAmount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Payment Method:</span>
                      <span className="capitalize">{bookingData.paymentPlan}</span>
                    </div>
                    {bookingData.paymentPlan === 'deposit' && (
                      <div className="flex justify-between text-blue-600">
                        <span>Due Today:</span>
                        <span className="font-semibold">${bookingData.depositAmount}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="terms"
                      checked={bookingData.agreedToTerms}
                      onCheckedChange={(checked) => setBookingData(prev => ({ ...prev, agreedToTerms: checked as boolean }))}
                    />
                    <Label htmlFor="terms" className="text-sm">
                      I agree to the <Button variant="link" className="p-0 h-auto text-sm">Terms and Conditions</Button> and <Button variant="link" className="p-0 h-auto text-sm">Cancellation Policy</Button>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="marketing"
                      checked={bookingData.marketingOptIn}
                      onCheckedChange={(checked) => setBookingData(prev => ({ ...prev, marketingOptIn: checked as boolean }))}
                    />
                    <Label htmlFor="marketing" className="text-sm">
                      I'd like to receive travel tips and special offers via email
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return <div>Step not found</div>;
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Loading trip details...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-8 bg-muted animate-pulse rounded-md" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Quick booking flow for returning customers (combines steps)
  const quickBookingSteps = [
    { id: 'trip-details', title: 'Trip Overview', required: true },
    { id: 'participants', title: 'Quick Info', required: true },
    { id: 'payment', title: 'Payment', required: true }
  ];

  const currentSteps = quickBookingMode ? quickBookingSteps : steps;

  return (
    <Card className={className}>
      <CardHeader>
        {/* Quick Booking Mode Toggle for Returning Customers */}
        {isReturningCustomer && !quickBookingMode && currentStep === 0 && (
          <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="font-semibold text-blue-900">Welcome back!</div>
                  <div className="text-sm text-blue-700">Use Quick Booking with your saved details</div>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => setQuickBookingMode(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Quick Book
              </Button>
            </div>
          </div>
        )}

        {/* Real-time Availability Alert */}
        {availabilityInfo.spotsLeft <= 3 && availabilityInfo.isAvailable && (
          <div className="mb-4 p-3 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg">
            <div className="flex items-center gap-2 text-orange-800">
              <Clock className="h-5 w-5" />
              <div>
                <div className="font-semibold">Limited Availability!</div>
                <div className="text-sm">Only {availabilityInfo.spotsLeft} spots remaining</div>
              </div>
            </div>
          </div>
        )}

        {/* Main Header */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <CardTitle className={isMobile ? "text-lg" : "text-xl"}>
                {quickBookingMode ? "Quick Book" : "Book Your Adventure"}
              </CardTitle>
              {progressSaved && (
                <div className="flex items-center gap-1 text-green-600 text-sm">
                  <Save className="h-4 w-4" />
                  <span>Saved</span>
                </div>
              )}
            </div>
            <CardDescription className="flex items-center gap-2 mt-1">
              <span>Step {currentStep + 1} of {currentSteps.length}: {currentSteps[currentStep].title}</span>
              {quickBookingMode && (
                <Badge variant="secondary" className="text-xs">
                  <Zap className="h-3 w-3 mr-1" />
                  Quick Mode
                </Badge>
              )}
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Progress Reset Button */}
            {currentStep > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setCurrentStep(0);
                  clearProgress();
                  toast({ title: "Progress Reset", description: "Booking progress has been reset." });
                }}
                className="text-muted-foreground"
              >
                <RotateCcw className="h-4 w-4" />
                {!isMobile && <span className="ml-2">Reset</span>}
              </Button>
            )}
            
            {/* Quick Mode Toggle */}
            {isReturningCustomer && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setQuickBookingMode(!quickBookingMode);
                  setCurrentStep(0);
                }}
                className="text-muted-foreground"
              >
                <Zap className="h-4 w-4" />
                {!isMobile && <span className="ml-2">{quickBookingMode ? 'Full Mode' : 'Quick Mode'}</span>}
              </Button>
            )}
            
            {onCancel && (
              <Button variant="ghost" size={isMobile ? "sm" : "default"} onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </div>
        
        {/* Progress Indicator - Mobile Optimized */}
        <div className={`flex items-center mt-4 ${isMobile ? 'justify-center space-x-1' : 'space-x-2'}`}>
          {currentSteps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  index <= currentStep
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {index < currentStep ? (
                  <CheckCircle className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                ) : (
                  index + 1
                )}
              </div>
              {index < currentSteps.length - 1 && (
                <div
                  className={`${isMobile ? 'w-4 h-0.5' : 'w-8 h-0.5'} transition-colors ${
                    index < currentStep ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {validationErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
            <div className="flex items-center gap-2 text-red-700 text-sm font-medium mb-2">
              <AlertTriangle className="h-4 w-4" />
              Please fix the following issues:
            </div>
            <ul className="text-red-600 text-sm space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {renderStepContent()}
        
        <Separator className="my-6" />
        
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={goToPreviousStep}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          
          {currentStep === currentSteps.length - 1 ? (
            <Button
              onClick={submitBooking}
              disabled={submitting || (!quickBookingMode && !bookingData.agreedToTerms)}
            >
              {submitting ? 'Submitting...' : 'Confirm Booking'}
              <CheckCircle className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={goToNextStep}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}