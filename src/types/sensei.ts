// Sensei-specific types and interfaces

export type SenseiLevel = 'apprentice' | 'journey_guide' | 'master_sensei';

export interface SenseiProfile {
  id: string;
  user_id: string;
  name: string;
  specialty: string;
  bio: string;
  image_url?: string;
  experience: string;
  location: string;
  specialties: string[];
  certifications?: string[];
  unavailable_months?: string[];
  sensei_level: SenseiLevel;
  is_active: boolean;
  is_offline?: boolean;
  trips_led: number;
  rating: number;
  can_create_trips: boolean;
  trip_creation_requested: boolean;
  trip_creation_request_date?: string;
  level_achieved_at?: string;
  level_requirements_met?: Record<string, any>;
  trip_edit_permissions?: Record<string, any>;
  availability_periods?: AvailabilityPeriod[];
  created_at: string;
  updated_at: string;
}

export interface AvailabilityPeriod {
  startDate: string;
  endDate: string;
  status: 'available' | 'unavailable' | 'busy';
  reason?: string;
}

export interface SenseiCertificate {
  id: string;
  sensei_id: string;
  certificate_name: string;
  certificate_type: string;
  certificate_number?: string;
  issuing_organization?: string;
  issue_date?: string;
  expiry_date?: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  verified_by_admin: boolean;
  verified_at?: string;
  is_active: boolean;
  certificate_file_url?: string;
  created_at: string;
  updated_at: string;
}

export interface SenseiSkill {
  id: string;
  sensei_id: string;
  skill_name: string;
  skill_category: string;
  proficiency_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  years_experience?: number;
  description?: string;
  is_verified: boolean;
  verified_by_admin: boolean;
  verified_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SenseiAchievement {
  id: string;
  sensei_id: string;
  achievement_type: string;
  achievement_name: string;
  achievement_description?: string;
  metadata?: Record<string, any>;
  unlocked_at: string;
}

export interface SenseiGoal {
  id: string;
  sensei_id: string;
  title: string;
  description?: string;
  category: 'trips' | 'rating' | 'revenue' | 'skills' | 'certificates';
  target: number;
  current_value: number;
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  deadline?: string;
  created_at: string;
  updated_at: string;
}

export interface SenseiMilestone {
  id: string;
  goal_id: string;
  title: string;
  completed: boolean;
  completed_date?: string;
  created_at: string;
  updated_at: string;
}

export interface SenseiMatchScore {
  sensei_id: string;
  sensei_name: string;
  match_score: number;
  weighted_score: number;
  specialty_matches: string[];
  certificate_matches: string[];
  skill_matches: string[];
  verified_certificates: string[];
  missing_requirements: string[];
  requirements_met_percentage: number;
  proficiency_bonus: number;
  location: string;
  rating: number;
  is_available: boolean;
}

export interface SenseiMatchingInsights {
  id: string;
  sensei_id: string;
  total_trips_available: number;
  high_match_trips: number;
  medium_match_trips: number;
  low_match_trips: number;
  missing_skills: string[];
  recommended_certifications: string[];
  last_calculated: string;
  created_at: string;
  updated_at: string;
}

export interface SenseiLevelRequirements {
  level: SenseiLevel;
  min_trips_completed: number;
  min_average_rating: number;
  additional_requirements?: Record<string, any>;
}

export interface SenseiLevelHistory {
  id: string;
  sensei_id: string;
  previous_level?: SenseiLevel;
  new_level: SenseiLevel;
  changed_by?: string;
  change_reason?: string;
  requirements_met?: Record<string, any>;
  created_at: string;
}

export interface SenseiPermissions {
  can_view_trips: boolean;
  can_apply_backup: boolean;
  can_edit_profile: boolean;
  can_edit_trips: boolean;
  can_create_trips: boolean;
  can_use_ai_builder: boolean;
  can_publish_trips: boolean;
  can_modify_pricing: boolean;
  trip_edit_fields: string[];
}

export interface SenseiAnalytics {
  tripsCompleted: number;
  averageGroupSize: number;
  customerSatisfaction: number;
  onTimePerformance: number;
  revenue: number;
  bookingRate: number;
  repeatCustomers: number;
  monthlyData: {
    month: string;
    trips: number;
    revenue: number;
    customers: number;
    rating: number;
  }[];
  achievements: SenseiAchievement[];
  topSkills: string[];
  recentCertifications: SenseiCertificate[];
}

export interface SkillVerificationRequest {
  id: string;
  sensei_id: string;
  skill_id: string;
  verification_type: 'admin' | 'peer' | 'customer';
  evidence_url?: string;
  evidence_description?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}