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
      admin_alerts: {
        Row: {
          alert_type: string
          created_at: string
          id: string
          is_resolved: boolean
          message: string
          metadata: Json | null
          priority: string
          resolved_at: string | null
          resolved_by: string | null
          sensei_id: string | null
          title: string
          trip_id: string | null
          updated_at: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          id?: string
          is_resolved?: boolean
          message: string
          metadata?: Json | null
          priority?: string
          resolved_at?: string | null
          resolved_by?: string | null
          sensei_id?: string | null
          title: string
          trip_id?: string | null
          updated_at?: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          id?: string
          is_resolved?: boolean
          message?: string
          metadata?: Json | null
          priority?: string
          resolved_at?: string | null
          resolved_by?: string | null
          sensei_id?: string | null
          title?: string
          trip_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_alerts_sensei_id_fkey"
            columns: ["sensei_id"]
            isOneToOne: false
            referencedRelation: "sensei_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_alerts_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
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
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      admin_roles: {
        Row: {
          assigned_by: string | null
          created_at: string
          granted_at: string
          granted_by: string | null
          id: string
          is_active: boolean
          permissions: Json | null
          role: Database["public"]["Enums"]["platform_role"]
          role_description: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          permissions?: Json | null
          role?: Database["public"]["Enums"]["platform_role"]
          role_description?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          permissions?: Json | null
          role?: Database["public"]["Enums"]["platform_role"]
          role_description?: string | null
          updated_at?: string
          user_id?: string
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
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
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
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
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
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
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
      backup_sensei_requests: {
        Row: {
          created_at: string
          id: string
          match_score: number | null
          request_type: string
          requested_at: string
          responded_at: string | null
          response_deadline: string
          response_reason: string | null
          sensei_id: string
          status: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_score?: number | null
          request_type?: string
          requested_at?: string
          responded_at?: string | null
          response_deadline: string
          response_reason?: string | null
          sensei_id: string
          status?: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          match_score?: number | null
          request_type?: string
          requested_at?: string
          responded_at?: string | null
          response_deadline?: string
          response_reason?: string | null
          sensei_id?: string
          status?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "backup_sensei_requests_sensei_id_fkey"
            columns: ["sensei_id"]
            isOneToOne: false
            referencedRelation: "sensei_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backup_sensei_requests_trip_id_fkey"
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
      customer_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          related_trip_id: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          related_trip_id?: string | null
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          related_trip_id?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      customer_wishlists: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          trip_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          trip_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          trip_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      destination_skill_mappings: {
        Row: {
          activity_types: string[] | null
          country: string
          created_at: string
          cultural_contexts: string[] | null
          destination: string
          id: string
          primary_languages: string[] | null
          region: string | null
          skill_weights: Json | null
          updated_at: string
        }
        Insert: {
          activity_types?: string[] | null
          country: string
          created_at?: string
          cultural_contexts?: string[] | null
          destination: string
          id?: string
          primary_languages?: string[] | null
          region?: string | null
          skill_weights?: Json | null
          updated_at?: string
        }
        Update: {
          activity_types?: string[] | null
          country?: string
          created_at?: string
          cultural_contexts?: string[] | null
          destination?: string
          id?: string
          primary_languages?: string[] | null
          region?: string | null
          skill_weights?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      payment_failures: {
        Row: {
          amount: number
          attempted_at: string
          created_at: string
          failure_reason: string
          id: string
          payment_plan_id: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          attempted_at?: string
          created_at?: string
          failure_reason: string
          id?: string
          payment_plan_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          attempted_at?: string
          created_at?: string
          failure_reason?: string
          id?: string
          payment_plan_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_failures_payment_plan_id_fkey"
            columns: ["payment_plan_id"]
            isOneToOne: false
            referencedRelation: "payment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_plans: {
        Row: {
          booking_id: string | null
          created_at: string
          deposit_amount: number
          id: string
          installment_amount: number
          installment_count: number
          next_payment_date: string | null
          payments_completed: number | null
          plan_type: string
          status: string | null
          stripe_customer_id: string | null
          total_amount: number
          trip_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          deposit_amount: number
          id?: string
          installment_amount: number
          installment_count: number
          next_payment_date?: string | null
          payments_completed?: number | null
          plan_type: string
          status?: string | null
          stripe_customer_id?: string | null
          total_amount: number
          trip_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          deposit_amount?: number
          id?: string
          installment_amount?: number
          installment_count?: number
          next_payment_date?: string | null
          payments_completed?: number | null
          plan_type?: string
          status?: string | null
          stripe_customer_id?: string | null
          total_amount?: number
          trip_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_plans_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "trip_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_plans_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_reminders: {
        Row: {
          booking_id: string | null
          created_at: string
          id: string
          is_sent: boolean | null
          message: string
          reminder_type: string
          scheduled_date: string
          sent_at: string | null
          trip_id: string | null
          user_id: string | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          id?: string
          is_sent?: boolean | null
          message: string
          reminder_type: string
          scheduled_date: string
          sent_at?: string | null
          trip_id?: string | null
          user_id?: string | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          id?: string
          is_sent?: boolean | null
          message?: string
          reminder_type?: string
          scheduled_date?: string
          sent_at?: string | null
          trip_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_reminders_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "trip_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminders_trip_id_fkey"
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
      production_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          id: string
          is_resolved: boolean | null
          message: string
          metadata: Json | null
          resolved_at: string | null
          severity: string
          title: string
          updated_at: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          message: string
          metadata?: Json | null
          resolved_at?: string | null
          severity: string
          title: string
          updated_at?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          message?: string
          metadata?: Json | null
          resolved_at?: string | null
          severity?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      sensei_achievements: {
        Row: {
          achievement_description: string | null
          achievement_name: string
          achievement_type: string
          id: string
          metadata: Json | null
          sensei_id: string
          unlocked_at: string
        }
        Insert: {
          achievement_description?: string | null
          achievement_name: string
          achievement_type: string
          id?: string
          metadata?: Json | null
          sensei_id: string
          unlocked_at?: string
        }
        Update: {
          achievement_description?: string | null
          achievement_name?: string
          achievement_type?: string
          id?: string
          metadata?: Json | null
          sensei_id?: string
          unlocked_at?: string
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
      sensei_goals: {
        Row: {
          category: string
          created_at: string
          current_value: number | null
          deadline: string | null
          description: string | null
          id: string
          priority: string
          sensei_id: string
          status: string
          target: number
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          current_value?: number | null
          deadline?: string | null
          description?: string | null
          id?: string
          priority?: string
          sensei_id: string
          status?: string
          target: number
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          current_value?: number | null
          deadline?: string | null
          description?: string | null
          id?: string
          priority?: string
          sensei_id?: string
          status?: string
          target?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      sensei_level_field_permissions: {
        Row: {
          can_edit: boolean
          created_at: string
          field_name: string
          id: string
          sensei_level: string
          updated_at: string
        }
        Insert: {
          can_edit?: boolean
          created_at?: string
          field_name: string
          id?: string
          sensei_level: string
          updated_at?: string
        }
        Update: {
          can_edit?: boolean
          created_at?: string
          field_name?: string
          id?: string
          sensei_level?: string
          updated_at?: string
        }
        Relationships: []
      }
      sensei_level_history: {
        Row: {
          change_reason: string | null
          changed_by: string | null
          created_at: string
          id: string
          new_level: string
          previous_level: string | null
          requirements_met: Json | null
          sensei_id: string
        }
        Insert: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string
          id?: string
          new_level: string
          previous_level?: string | null
          requirements_met?: Json | null
          sensei_id: string
        }
        Update: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string
          id?: string
          new_level?: string
          previous_level?: string | null
          requirements_met?: Json | null
          sensei_id?: string
        }
        Relationships: []
      }
      sensei_level_permissions: {
        Row: {
          can_apply_backup: boolean
          can_create_trips: boolean
          can_edit_profile: boolean
          can_edit_trips: boolean
          can_modify_pricing: boolean
          can_publish_trips: boolean
          can_use_ai_builder: boolean
          can_view_trips: boolean
          created_at: string
          id: string
          sensei_level: string
          updated_at: string
        }
        Insert: {
          can_apply_backup?: boolean
          can_create_trips?: boolean
          can_edit_profile?: boolean
          can_edit_trips?: boolean
          can_modify_pricing?: boolean
          can_publish_trips?: boolean
          can_use_ai_builder?: boolean
          can_view_trips?: boolean
          created_at?: string
          id?: string
          sensei_level: string
          updated_at?: string
        }
        Update: {
          can_apply_backup?: boolean
          can_create_trips?: boolean
          can_edit_profile?: boolean
          can_edit_trips?: boolean
          can_modify_pricing?: boolean
          can_publish_trips?: boolean
          can_use_ai_builder?: boolean
          can_view_trips?: boolean
          created_at?: string
          id?: string
          sensei_level?: string
          updated_at?: string
        }
        Relationships: []
      }
      sensei_level_requirements: {
        Row: {
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          level_name: string
          level_order: number
          rating_required: number
          trips_required: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean
          level_name: string
          level_order: number
          rating_required?: number
          trips_required?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          level_name?: string
          level_order?: number
          rating_required?: number
          trips_required?: number
          updated_at?: string
        }
        Relationships: []
      }
      sensei_matching_insights: {
        Row: {
          created_at: string
          high_match_trips: number | null
          id: string
          last_calculated: string
          low_match_trips: number | null
          medium_match_trips: number | null
          missing_skills: string[] | null
          recommended_certifications: string[] | null
          sensei_id: string
          total_trips_available: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          high_match_trips?: number | null
          id?: string
          last_calculated?: string
          low_match_trips?: number | null
          medium_match_trips?: number | null
          missing_skills?: string[] | null
          recommended_certifications?: string[] | null
          sensei_id: string
          total_trips_available?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          high_match_trips?: number | null
          id?: string
          last_calculated?: string
          low_match_trips?: number | null
          medium_match_trips?: number | null
          missing_skills?: string[] | null
          recommended_certifications?: string[] | null
          sensei_id?: string
          total_trips_available?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      sensei_milestones: {
        Row: {
          completed: boolean | null
          completed_date: string | null
          created_at: string
          goal_id: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          completed?: boolean | null
          completed_date?: string | null
          created_at?: string
          goal_id: string
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          completed?: boolean | null
          completed_date?: string | null
          created_at?: string
          goal_id?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sensei_milestones_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "sensei_goals"
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
          level_achieved_at: string | null
          level_requirements_met: Json | null
          location: string
          name: string
          rating: number | null
          sensei_level: string | null
          specialties: string[]
          specialty: string
          trip_creation_request_date: string | null
          trip_creation_requested: boolean | null
          trip_edit_permissions: Json | null
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
          level_achieved_at?: string | null
          level_requirements_met?: Json | null
          location: string
          name: string
          rating?: number | null
          sensei_level?: string | null
          specialties?: string[]
          specialty: string
          trip_creation_request_date?: string | null
          trip_creation_requested?: boolean | null
          trip_edit_permissions?: Json | null
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
          level_achieved_at?: string | null
          level_requirements_met?: Json | null
          location?: string
          name?: string
          rating?: number | null
          sensei_level?: string | null
          specialties?: string[]
          specialty?: string
          trip_creation_request_date?: string | null
          trip_creation_requested?: boolean | null
          trip_edit_permissions?: Json | null
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
      skill_verification_requests: {
        Row: {
          created_at: string
          evidence_description: string | null
          evidence_url: string | null
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          sensei_id: string
          skill_id: string
          status: string
          updated_at: string
          verification_type: string
        }
        Insert: {
          created_at?: string
          evidence_description?: string | null
          evidence_url?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sensei_id: string
          skill_id: string
          status?: string
          updated_at?: string
          verification_type?: string
        }
        Update: {
          created_at?: string
          evidence_description?: string | null
          evidence_url?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sensei_id?: string
          skill_id?: string
          status?: string
          updated_at?: string
          verification_type?: string
        }
        Relationships: []
      }
      trip_bookings: {
        Row: {
          booking_date: string
          booking_status: string
          booking_type: string | null
          created_at: string
          id: string
          last_reminder_sent: string | null
          notes: string | null
          payment_deadline: string | null
          payment_status: string
          reminder_count: number | null
          reservation_deadline: string | null
          total_amount: number | null
          trip_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          booking_date?: string
          booking_status?: string
          booking_type?: string | null
          created_at?: string
          id?: string
          last_reminder_sent?: string | null
          notes?: string | null
          payment_deadline?: string | null
          payment_status?: string
          reminder_count?: number | null
          reservation_deadline?: string | null
          total_amount?: number | null
          trip_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          booking_date?: string
          booking_status?: string
          booking_type?: string | null
          created_at?: string
          id?: string
          last_reminder_sent?: string | null
          notes?: string | null
          payment_deadline?: string | null
          payment_status?: string
          reminder_count?: number | null
          reservation_deadline?: string | null
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
        Relationships: [
          {
            foreignKeyName: "trip_reviews_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          backup_assignment_deadline: string | null
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
          end_date: string | null
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
          requires_backup_sensei: boolean | null
          sensei_id: string | null
          sensei_name: string
          start_date: string | null
          theme: string
          title: string
          trip_status: string
          updated_at: string
        }
        Insert: {
          backup_assignment_deadline?: string | null
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
          end_date?: string | null
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
          requires_backup_sensei?: boolean | null
          sensei_id?: string | null
          sensei_name: string
          start_date?: string | null
          theme: string
          title: string
          trip_status?: string
          updated_at?: string
        }
        Update: {
          backup_assignment_deadline?: string | null
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
          end_date?: string | null
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
          requires_backup_sensei?: boolean | null
          sensei_id?: string | null
          sensei_name?: string
          start_date?: string | null
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
      admin_update_sensei_level: {
        Args: {
          p_sensei_id: string
          p_new_level: string
          p_reason?: string
          p_admin_override?: boolean
        }
        Returns: Json
      }
      assign_admin_role: {
        Args: {
          p_user_email: string
          p_role: Database["public"]["Enums"]["platform_role"]
          p_assigned_by?: string
        }
        Returns: Json
      }
      auto_upgrade_sensei_levels: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      calculate_enhanced_sensei_insights: {
        Args: { p_sensei_id: string }
        Returns: Json
      }
      calculate_enhanced_sensei_match_score: {
        Args: {
          p_sensei_id: string
          p_trip_theme: string
          p_destination?: string
          p_trip_months?: string[]
          p_trip_id?: string
        }
        Returns: {
          match_score: number
          weighted_score: number
          specialty_matches: string[]
          certificate_matches: string[]
          skill_matches: string[]
          language_matches: string[]
          destination_context_score: number
          missing_requirements: string[]
          contextual_recommendations: string[]
          requirements_met_percentage: number
          language_bonus: number
          cultural_bonus: number
          activity_bonus: number
        }[]
      }
      calculate_payment_deadline: {
        Args: { trip_start_date: string }
        Returns: string
      }
      calculate_sensei_insights: {
        Args: { p_sensei_id: string }
        Returns: undefined
      }
      calculate_sensei_level_eligibility: {
        Args: { p_sensei_id: string }
        Returns: Json
      }
      calculate_sensei_match_score_enhanced: {
        Args: {
          p_sensei_id: string
          p_trip_theme: string
          p_trip_months?: string[]
          p_trip_id?: string
        }
        Returns: {
          match_score: number
          weighted_score: number
          specialty_matches: string[]
          certificate_matches: string[]
          skill_matches: string[]
          missing_requirements: string[]
          requirements_met_percentage: number
          proficiency_bonus: number
        }[]
      }
      can_manage_finances: {
        Args: { user_id?: string }
        Returns: boolean
      }
      can_manage_roles: {
        Args: { user_id?: string }
        Returns: boolean
      }
      can_manage_senseis: {
        Args: { user_id?: string }
        Returns: boolean
      }
      can_manage_trips: {
        Args: { user_id?: string }
        Returns: boolean
      }
      can_view_customers: {
        Args: { user_id?: string }
        Returns: boolean
      }
      check_backup_requirements: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      check_sensei_level_eligibility: {
        Args: { p_sensei_id: string }
        Returns: Json
      }
      get_comprehensive_system_status: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_customer_travel_stats: {
        Args: { _user_id: string }
        Returns: {
          trips_completed: number
          trips_pending: number
          total_spent: number
          trips_wishlisted: number
          avg_rating_given: number
          reviews_written: number
          preferred_themes: string[]
        }[]
      }
      get_sensei_permissions: {
        Args: { p_sensei_id: string }
        Returns: Json
      }
      get_sensei_trip_status: {
        Args: { p_sensei_id: string }
        Returns: Json
      }
      get_user_platform_role: {
        Args: { user_id?: string }
        Returns: Database["public"]["Enums"]["platform_role"]
      }
      is_admin: {
        Args: { user_id?: string }
        Returns: boolean
      }
      log_admin_action: {
        Args: {
          action_type: string
          table_name?: string
          record_id?: string
          old_values?: Json
          new_values?: Json
        }
        Returns: undefined
      }
      log_production_alert: {
        Args: {
          p_alert_type: string
          p_severity: string
          p_title: string
          p_message: string
          p_metadata?: Json
        }
        Returns: string
      }
      request_backup_senseis: {
        Args:
          | { p_trip_id: string }
          | { p_trip_id: string; p_max_requests?: number }
        Returns: Json
      }
      revoke_admin_role: {
        Args: { p_role_id: string; p_revoked_by?: string }
        Returns: Json
      }
      search_users_by_email: {
        Args: { email_pattern: string }
        Returns: {
          user_id: string
          email: string
          created_at: string
        }[]
      }
      send_welcome_message_to_participant: {
        Args: { trip_booking_id: string; user_id: string; trip_id: string }
        Returns: undefined
      }
      send_welcome_message_to_sensei: {
        Args: { sensei_id: string }
        Returns: undefined
      }
      send_welcome_to_all_existing_senseis: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      send_welcome_to_existing_participants: {
        Args: Record<PropertyKey, never>
        Returns: number
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
      upgrade_sensei_level: {
        Args: { p_sensei_id: string; p_new_level: string; p_reason?: string }
        Returns: Json
      }
      validate_sensei_action: {
        Args: { p_sensei_id: string; p_action: string }
        Returns: boolean
      }
    }
    Enums: {
      platform_role:
        | "admin"
        | "journey_curator"
        | "sensei_scout"
        | "traveler_support"
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
    Enums: {
      platform_role: [
        "admin",
        "journey_curator",
        "sensei_scout",
        "traveler_support",
      ],
    },
  },
} as const
