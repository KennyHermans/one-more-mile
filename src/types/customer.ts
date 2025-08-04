// Customer-specific types and interfaces
import { Trip, TripBooking } from './trip';
import { SenseiProfile } from './sensei';

// Additional interfaces needed for customer types
export interface TripSuggestion {
  trip: Trip;
  matchScore: number;
  matchReasons: string[];
  similarTrips: Trip[];
  alternativeDates?: string[];
  priceComparison?: {
    lowest: number;
    highest: number;
    average: number;
  };
}

export interface TripReview {
  id: string;
  trip_id: string;
  user_id: string;
  sensei_id: string;
  rating: number;
  review_text: string;
  review_categories: {
    organization: number;
    knowledge: number;
    communication: number;
    safety: number;
    value: number;
  };
  would_recommend: boolean;
  photos?: string[];
  is_verified: boolean;
  is_featured: boolean;
  helpful_votes: number;
  created_at: string;
  updated_at: string;
}

export interface TripMessage {
  id: string;
  trip_id: string;
  sender_id: string;
  recipient_id?: string;
  sender_type: 'sensei' | 'customer' | 'admin';
  message_type: 'text' | 'image' | 'file' | 'announcement';
  message_text: string;
  message_context: 'group' | 'private';
  file_url?: string;
  read_at?: string;
  is_deleted: boolean;
  created_at: string;
}

export interface CustomerProfile {
  id: string;
  user_id: string;
  full_name?: string;
  phone?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  dietary_restrictions?: string;
  medical_conditions?: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerWishlist {
  id: string;
  user_id: string;
  trip_id: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  trips?: Trip; // Joined trip data
}

export interface CustomerNotification {
  id: string;
  user_id: string;
  type: 'general' | 'booking' | 'payment' | 'trip_update' | 'review_request' | 'promotion';
  title: string;
  message: string;
  is_read: boolean;
  related_trip_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerTodo {
  id: string;
  user_id: string;
  trip_id?: string;
  title: string;
  description?: string;
  completed: boolean;
  due_date?: string;
  created_by_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerDocument {
  id: string;
  user_id: string;
  trip_id?: string;
  document_name: string;
  document_type: 'passport' | 'visa' | 'insurance' | 'medical' | 'emergency_contact' | 'other';
  file_url: string;
  uploaded_at: string;
}

export interface CustomerTravelStats {
  trips_completed: number;
  trips_pending: number;
  total_spent: number;
  trips_wishlisted: number;
  avg_rating_given: number;
  reviews_written: number;
  preferred_themes: string[];
}

export interface CustomerDashboardData {
  profile: CustomerProfile;
  upcomingTrips: Trip[];
  pastTrips: Trip[];
  wishlistItems: CustomerWishlist[];
  notifications: CustomerNotification[];
  todos: CustomerTodo[];
  documents: CustomerDocument[];
  travelStats: CustomerTravelStats;
  recommendations: TripSuggestion[];
}

export interface CustomerBookingHistory {
  booking: TripBooking;
  trip: Trip;
  sensei: SenseiProfile;
  review?: TripReview;
  messages: TripMessage[];
  status_updates: BookingStatusUpdate[];
}

export interface BookingStatusUpdate {
  id: string;
  booking_id: string;
  status: string;
  updated_by: string;
  notes?: string;
  created_at: string;
}

export interface CustomerPreferences {
  id: string;
  user_id: string;
  preferred_destinations: string[];
  preferred_themes: string[];
  budget_range: {
    min: number;
    max: number;
  };
  travel_style: 'luxury' | 'comfort' | 'budget' | 'adventure';
  group_size_preference: 'small' | 'medium' | 'large' | 'any';
  difficulty_preference: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  notification_settings: {
    email_notifications: boolean;
    sms_notifications: boolean;
    push_notifications: boolean;
    marketing_emails: boolean;
  };
  accessibility_requirements?: string[];
  dietary_preferences?: string[];
  created_at: string;
  updated_at: string;
}

export interface CustomerFeedback {
  id: string;
  user_id: string;
  trip_id?: string;
  feedback_type: 'bug_report' | 'feature_request' | 'general_feedback' | 'complaint' | 'praise';
  subject: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  admin_response?: string;
  responded_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentPlan {
  id: string;
  booking_id: string;
  user_id: string;
  trip_id: string;
  plan_type: 'full_payment' | 'installments';
  total_amount: number;
  deposit_amount: number;
  installment_amount: number;
  installment_count: number;
  payments_completed: number;
  next_payment_date?: string;
  status: 'active' | 'completed' | 'cancelled' | 'overdue';
  stripe_customer_id?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentReminder {
  id: string;
  user_id: string;
  booking_id: string;
  trip_id: string;
  reminder_type: 'payment_due' | 'final_payment' | 'overdue';
  scheduled_date: string;
  message: string;
  is_sent: boolean;
  sent_at?: string;
  created_at: string;
}

export interface PaymentFailure {
  id: string;
  user_id: string;
  payment_plan_id: string;
  amount: number;
  failure_reason: string;
  attempted_at: string;
  created_at: string;
}

export interface CustomerAnalytics {
  totalCustomers: number;
  activeCustomers: number;
  newCustomersThisMonth: number;
  averageBookingValue: number;
  customerLifetimeValue: number;
  repeatCustomerRate: number;
  churnRate: number;
  customerSatisfactionScore: number;
  segmentData: {
    [segment: string]: {
      count: number;
      averageSpend: number;
      bookingFrequency: number;
    };
  };
  geographicDistribution: {
    country: string;
    count: number;
    percentage: number;
  }[];
  bookingTrends: {
    month: string;
    newCustomers: number;
    returningCustomers: number;
    totalBookings: number;
  }[];
}

export interface CustomerSegment {
  id: string;
  name: string;
  description: string;
  criteria: {
    field: string;
    operator: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'in';
    value: any;
  }[];
  customer_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CustomerJourney {
  stage: 'awareness' | 'consideration' | 'booking' | 'experience' | 'advocacy';
  touchpoints: {
    name: string;
    timestamp: string;
    data?: Record<string, any>;
  }[];
  conversion_events: {
    event: string;
    timestamp: string;
    value?: number;
  }[];
  satisfaction_scores: {
    stage: string;
    score: number;
    feedback?: string;
  }[];
}