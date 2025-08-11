// Admin-specific types and interfaces

export interface AdminStats {
  totalApplications: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  totalTrips: number;
  activeTrips: number;
  completedTrips: number;
  totalSenseis: number;
  activeSenseis: number;
  totalBookings: number;
  totalRevenue: number;
  averageRating: number;
}

export interface AdminAlert {
  id: string;
  title: string;
  message: string;
  alert_type: 'missing_backup' | 'payment_overdue' | 'trip_cancelled' | 'system_warning';
  priority: 'low' | 'medium' | 'high' | 'critical';
  is_resolved: boolean;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
  trip_id?: string;
  sensei_id?: string;
  metadata?: Record<string, any>;
}

export interface AdminAuditLog {
  id: string;
  admin_user_id: string;
  action: string;
  table_name?: string;
  record_id?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  created_at: string;
  ip_address?: string;
  user_agent?: string;
}

export interface AdminRole {
  id: string;
  user_id: string;
  role: 'admin' | 'journey_curator' | 'sensei_scout' | 'traveler_support' | 'partner';
  is_active: boolean;
  permissions?: Record<string, any>;
  granted_by?: string;
  granted_at: string;
  role_description?: string;
  created_at: string;
  updated_at: string;
}

export interface BackupRequest {
  id: string;
  trip_id: string;
  sensei_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  match_score: number;
  request_type: 'automatic' | 'manual';
  requested_at: string;
  response_deadline: string;
  responded_at?: string;
  response_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminDashboardFilters {
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  status?: string[];
  priority?: string[];
  alertType?: string[];
  senseiLevel?: string[];
  tripStatus?: string[];
}

export interface AdminActionContext {
  adminId: string;
  action: string;
  targetId?: string;
  targetType?: 'user' | 'trip' | 'application' | 'booking';
  reason?: string;
  metadata?: Record<string, any>;
}

export interface SystemHealth {
  database: {
    status: 'healthy' | 'warning' | 'critical';
    connections: number;
    slowQueries: number;
    lastBackup?: string;
  };
  realtime: {
    status: 'healthy' | 'warning' | 'critical';
    activeSubscriptions: number;
    latency?: number;
  };
  storage: {
    status: 'healthy' | 'warning' | 'critical';
    usagePercentage: number;
    totalSize: string;
  };
  functions: {
    status: 'healthy' | 'warning' | 'critical';
    activeRequests: number;
    errorRate: number;
  };
}

// Analytics interfaces
export interface AdminAnalytics {
  userGrowth: {
    date: string;
    newUsers: number;
    totalUsers: number;
  }[];
  tripMetrics: {
    totalTrips: number;
    bookingRate: number;
    cancelationRate: number;
    averageRating: number;
  };
  revenueData: {
    date: string;
    revenue: number;
    bookings: number;
  }[];
  senseiPerformance: {
    senseiId: string;
    name: string;
    tripsCompleted: number;
    averageRating: number;
    revenue: number;
  }[];
}

export interface AdminPermissions {
  canManageUsers: boolean;
  canManageTrips: boolean;
  canManageSenseis: boolean;
  canViewFinancials: boolean;
  canManageRoles: boolean;
  canAccessAnalytics: boolean;
  canManageSettings: boolean;
  canViewAuditLogs: boolean;
}