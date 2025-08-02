export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      admin_announcements: {
        Row: {
          content: string
          created_at: string
          created_by_admin: boolean
          id: string
          is_active: boolean
          priority: string
          specific_sensei_ids: string[] | null
          target_audience: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by_admin?: boolean
          id?: string
          is_active?: boolean
          priority?: string
          specific_sensei_ids?: string[] | null
          target_audience?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by_admin?: boolean
          id?: string
          is_active?: boolean
          priority?: string
          specific_sensei_ids?: string[] | null
          target_audience?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          content: string
          created_at: string
          id: string
          is_active: boolean
          priority: string
          sensei_id: string
          title: string
          trip_id: string | null
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_active?: boolean
          priority?: string
          sensei_id: string
          title: string
          trip_id?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          priority?: string
          sensei_id?: string
          title?: string
          trip_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      applications: {
        Row: {
          availability: string
          bio: string
          created_at: string
          cv_file_url: string | null
          email: string
          expertise_areas: string[]
          full_name: string
          id: string
          languages: string[]
          location: string
          phone: string | null
          portfolio_url: string | null
          reference_text: string | null
          status: string
          updated_at: string
          user_id: string
          why_sensei: string
          years_experience: number
        }
        Insert: {
          availability: string
          bio: string
          created_at?: string
          cv_file_url?: string | null
          email: string
          expertise_areas?: string[]
          full_name: string
          id?: string
          languages?: string[]
          location: string
          phone?: string | null
          portfolio_url?: string | null
          reference_text?: string | null
          status?: string
          updated_at?: string
          user_id: string
          why_sensei: string
          years_experience: number
        }
        Update: {
          availability?: string
          bio?: string
          created_at?: string
          cv_file_url?: string | null
          email?: string
          expertise_areas?: string[]
          full_name?: string
          id?: string
          languages?: string[]
          location?: string
          phone?: string | null
          portfolio_url?: string | null
          reference_text?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          why_sensei?: string
          years_experience?: number
        }
        Relationships: []
      }
      backup_sensei_applications: {
        Row: {
          applied_at: string
          created_at: string
          id: string
          sensei_id: string
          status: string
          trip_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          applied_at?: string
          created_at?: string
          id?: string
          sensei_id: string
          status?: string
          trip_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          applied_at?: string
          created_at?: string
          id?: string
          sensei_id?: string
          status?: string
          trip_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "backup_sensei_applications_sensei_id_fkey"
            columns: ["sensei_id"]
            isOneToOne: false
            referencedRelation: "sensei_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backup_sensei_applications_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_documents: {
        Row: {
          document_name: string
          document_type: string
          file_url: string
          id: string
          trip_id: string | null
          uploaded_at: string
          user_id: string | null
        }
        Insert: {
          document_name: string
          document_type: string
          file_url: string
          id?: string
          trip_id?: string | null
          uploaded_at?: string
          user_id?: string | null
        }
        Update: {
          document_name?: string
          document_type?: string
          file_url?: string
          id?: string
          trip_id?: string | null
          uploaded_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_documents_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_profiles: {
        Row: {
          created_at: string
          dietary_restrictions: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string | null
          id: string
          medical_conditions: string | null
          phone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          dietary_restrictions?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string | null
          id?: string
          medical_conditions?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          dietary_restrictions?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string | null
          id?: string
          medical_conditions?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      customer_todos: {
        Row: {
          completed: boolean | null
          created_at: string
          created_by_admin: boolean | null
          description: string | null
          due_date: string | null
          id: string
          title: string
          trip_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          completed?: boolean | null
          created_at?: string
          created_by_admin?: boolean | null
          description?: string | null
          due_date?: string | null
          id?: string
          title: string
          trip_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          completed?: boolean | null
          created_at?: string
          created_by_admin?: boolean | null
          description?: string | null
          due_date?: string | null
          id?: string
          title?: string
          trip_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_todos_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_name: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_name: string
          setting_value: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_name?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      sensei_certificates: {
        Row: {
          certificate_file_url: string | null
          certificate_name: string
          certificate_number: string | null
          certificate_type: string
          created_at: string
          expiry_date: string | null
          id: string
          is_active: boolean
          issue_date: string | null
          issuing_organization: string | null
          sensei_id: string
          updated_at: string
          verification_status: string
          verified_at: string | null
          verified_by_admin: boolean | null
        }
        Insert: {
          certificate_file_url?: string | null
          certificate_name: string
          certificate_number?: string | null
          certificate_type: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          is_active?: boolean
          issue_date?: string | null
          issuing_organization?: string | null
          sensei_id: string
          updated_at?: string
          verification_status?: string
          verified_at?: string | null
          verified_by_admin?: boolean | null
        }
        Update: {
          certificate_file_url?: string | null
          certificate_name?: string
          certificate_number?: string | null
          certificate_type?: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          is_active?: boolean
          issue_date?: string | null
          issuing_organization?: string | null
          sensei_id?: string
          updated_at?: string
          verification_status?: string
          verified_at?: string | null
          verified_by_admin?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_sensei_certificates_sensei"
            columns: ["sensei_id"]
            isOneToOne: false
            referencedRelation: "sensei_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sensei_feedback: {
        Row: {
          created_at: string
          feedback_text: string
          id: string
          rating: number
          sensei_id: string
          trip_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback_text: string
          id?: string
          rating: number
          sensei_id: string
          trip_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feedback_text?: string
          id?: string
          rating?: number
          sensei_id?: string
          trip_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_sensei_feedback_sensei_id"
            columns: ["sensei_id"]
            isOneToOne: false
            referencedRelation: "sensei_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_sensei_feedback_trip_id"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      sensei_profiles: {
        Row: {
          availability_periods: Json | null
          bio: string
          can_create_trips: boolean
          certifications: string[] | null
          created_at: string
          experience: string
          id: string
          image_url: string | null
          is_active: boolean | null
          is_offline: boolean | null
          location: string
          name: string
          rating: number | null
          specialties: string[]
          specialty: string
          trip_creation_request_date: string | null
          trip_creation_requested: boolean
          trips_led: number | null
          unavailable_months: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          availability_periods?: Json | null
          bio: string
          can_create_trips?: boolean
          certifications?: string[] | null
          created_at?: string
          experience: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_offline?: boolean | null
          location: string
          name: string
          rating?: number | null
          specialties?: string[]
          specialty: string
          trip_creation_request_date?: string | null
          trip_creation_requested?: boolean
          trips_led?: number | null
          unavailable_months?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          availability_periods?: Json | null
          bio?: string
          can_create_trips?: boolean
          certifications?: string[] | null
          created_at?: string
          experience?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_offline?: boolean | null
          location?: string
          name?: string
          rating?: number | null
          specialties?: string[]
          specialty?: string
          trip_creation_request_date?: string | null
          trip_creation_requested?: boolean
          trips_led?: number | null
          unavailable_months?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sensei_skills: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_verified: boolean | null
          proficiency_level: string
          sensei_id: string
          skill_category: string
          skill_name: string
          updated_at: string
          verified_at: string | null
          verified_by_admin: boolean | null
          years_experience: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_verified?: boolean | null
          proficiency_level?: string
          sensei_id: string
          skill_category: string
          skill_name: string
          updated_at?: string
          verified_at?: string | null
          verified_by_admin?: boolean | null
          years_experience?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_verified?: boolean | null
          proficiency_level?: string
          sensei_id?: string
          skill_category?: string
          skill_name?: string
          updated_at?: string
          verified_at?: string | null
          verified_by_admin?: boolean | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_sensei_skills_sensei"
            columns: ["sensei_id"]
            isOneToOne: false
            referencedRelation: "sensei_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_bookings: {
        Row: {
          booking_date: string
          booking_status: string
          created_at: string
          id: string
          last_reminder_sent: string | null
          notes: string | null
          payment_deadline: string | null
          payment_status: string
          reminder_count: number | null
          total_amount: number | null
          trip_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          booking_date?: string
          booking_status?: string
          created_at?: string
          id?: string
          last_reminder_sent?: string | null
          notes?: string | null
          payment_deadline?: string | null
          payment_status?: string
          reminder_count?: number | null
          total_amount?: number | null
          trip_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          booking_date?: string
          booking_status?: string
          created_at?: string
          id?: string
          last_reminder_sent?: string | null
          notes?: string | null
          payment_deadline?: string | null
          payment_status?: string
          reminder_count?: number | null
          total_amount?: number | null
          trip_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_bookings_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_cancellations: {
        Row: {
          admin_notified: boolean | null
          cancellation_reason: string
          cancelled_at: string
          cancelled_by_sensei_id: string
          created_at: string
          id: string
          replacement_assigned_at: string | null
          replacement_sensei_id: string | null
          trip_id: string
          updated_at: string
        }
        Insert: {
          admin_notified?: boolean | null
          cancellation_reason: string
          cancelled_at?: string
          cancelled_by_sensei_id: string
          created_at?: string
          id?: string
          replacement_assigned_at?: string | null
          replacement_sensei_id?: string | null
          trip_id: string
          updated_at?: string
        }
        Update: {
          admin_notified?: boolean | null
          cancellation_reason?: string
          cancelled_at?: string
          cancelled_by_sensei_id?: string
          created_at?: string
          id?: string
          replacement_assigned_at?: string | null
          replacement_sensei_id?: string | null
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_trip_cancellations_cancelled_by_sensei_id"
            columns: ["cancelled_by_sensei_id"]
            isOneToOne: false
            referencedRelation: "sensei_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_trip_cancellations_replacement_sensei_id"
            columns: ["replacement_sensei_id"]
            isOneToOne: false
            referencedRelation: "sensei_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_trip_cancellations_trip_id"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_messages: {
        Row: {
          created_at: string
          file_url: string | null
          id: string
          is_deleted: boolean | null
          message_context: string
          message_text: string
          message_type: string
          read_at: string | null
          recipient_id: string | null
          sender_id: string
          sender_type: string
          trip_id: string
        }
        Insert: {
          created_at?: string
          file_url?: string | null
          id?: string
          is_deleted?: boolean | null
          message_context?: string
          message_text: string
          message_type?: string
          read_at?: string | null
          recipient_id?: string | null
          sender_id: string
          sender_type: string
          trip_id: string
        }
        Update: {
          created_at?: string
          file_url?: string | null
          id?: string
          is_deleted?: boolean | null
          message_context?: string
          message_text?: string
          message_type?: string
          read_at?: string | null
          recipient_id?: string | null
          sender_id?: string
          sender_type?: string
          trip_id?: string
        }
        Relationships: []
      }
      trip_permissions: {
        Row: {
          created_at: string
          id: string
          permissions: Json
          sensei_id: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          permissions?: Json
          sensei_id: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          permissions?: Json
          sensei_id?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_permissions_sensei_id_fkey"
            columns: ["sensei_id"]
            isOneToOne: false
            referencedRelation: "sensei_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_permissions_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_requirements: {
        Row: {
          created_at: string
          id: string
          is_mandatory: boolean
          minimum_level: string | null
          requirement_description: string | null
          requirement_name: string
          requirement_type: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_mandatory?: boolean
          minimum_level?: string | null
          requirement_description?: string | null
          requirement_name: string
          requirement_type: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_mandatory?: boolean
          minimum_level?: string | null
          requirement_description?: string | null
          requirement_name?: string
          requirement_type?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_trip_requirements_trip"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_reviews: {
        Row: {
          created_at: string
          id: string
          rating: number
          review_text: string | null
          sensei_id: string
          trip_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rating: number
          review_text?: string | null
          sensei_id: string
          trip_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rating?: number
          review_text?: string | null
          sensei_id?: string
          trip_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trips: {
        Row: {
          backup_sensei_id: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by_sensei: boolean | null
          created_at: string
          created_by_sensei: boolean
          created_by_user_id: string | null
          current_participants: number | null
          dates: string
          description: string
          destination: string
          difficulty_level: string
          duration_days: number
          excluded_items: string[] | null
          group_size: string
          id: string
          image_url: string
          included_amenities: string[] | null
          is_active: boolean | null
          max_participants: number
          price: string
          program: Json | null
          rating: number | null
          replacement_needed: boolean | null
          requirements: string[] | null
          sensei_id: string | null
          sensei_name: string
          theme: string
          title: string
          trip_status: string
          updated_at: string
        }
        Insert: {
          backup_sensei_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by_sensei?: boolean | null
          created_at?: string
          created_by_sensei?: boolean
          created_by_user_id?: string | null
          current_participants?: number | null
          dates: string
          description: string
          destination: string
          difficulty_level?: string
          duration_days: number
          excluded_items?: string[] | null
          group_size: string
          id?: string
          image_url: string
          included_amenities?: string[] | null
          is_active?: boolean | null
          max_participants?: number
          price: string
          program?: Json | null
          rating?: number | null
          replacement_needed?: boolean | null
          requirements?: string[] | null
          sensei_id?: string | null
          sensei_name: string
          theme: string
          title: string
          trip_status?: string
          updated_at?: string
        }
        Update: {
          backup_sensei_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by_sensei?: boolean | null
          created_at?: string
          created_by_sensei?: boolean
          created_by_user_id?: string | null
          current_participants?: number | null
          dates?: string
          description?: string
          destination?: string
          difficulty_level?: string
          duration_days?: number
          excluded_items?: string[] | null
          group_size?: string
          id?: string
          image_url?: string
          included_amenities?: string[] | null
          is_active?: boolean | null
          max_participants?: number
          price?: string
          program?: Json | null
          rating?: number | null
          replacement_needed?: boolean | null
          requirements?: string[] | null
          sensei_id?: string | null
          sensei_name?: string
          theme?: string
          title?: string
          trip_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_backup_sensei_id_fkey"
            columns: ["backup_sensei_id"]
            isOneToOne: false
            referencedRelation: "sensei_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_sensei_id_fkey"
            columns: ["sensei_id"]
            isOneToOne: false
            referencedRelation: "sensei_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_payment_deadline: {
        Args: { trip_start_date: string }
        Returns: string
      }
      get_sensei_trip_status: {
        Args: Record<PropertyKey, never>
        Returns: {
          sensei_id: string
          sensei_name: string
          is_linked_to_trip: boolean
          current_trip_count: number
          is_available: boolean
          specialties: string[]
          certifications: string[]
          location: string
          rating: number
        }[]
      }
      suggest_senseis_for_trip: {
        Args: { trip_theme: string; trip_months?: string[] }
        Returns: {
          sensei_id: string
          sensei_name: string
          match_score: number
          matching_specialties: string[]
          matching_certifications: string[]
          location: string
          rating: number
          is_available: boolean
        }[]
      }
      suggest_senseis_for_trip_enhanced: {
        Args: { trip_theme: string; trip_months?: string[]; trip_id?: string }
        Returns: {
          sensei_id: string
          sensei_name: string
          match_score: number
          matching_specialties: string[]
          matching_certifications: string[]
          matching_skills: string[]
          verified_certificates: string[]
          missing_requirements: string[]
          location: string
          rating: number
          is_available: boolean
          requirements_met_percentage: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
