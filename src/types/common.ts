// Common types used across the application

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  tripId?: string;
  metadata?: Record<string, any>;
  userAgent?: string;
  url?: string;
}

export interface LogEntry {
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  context?: ErrorContext;
  stack?: string;
  timestamp: string;
  sessionId?: string;
  buildVersion?: string;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: Error | string;
  success: boolean;
  message?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  search?: string;
  status?: string;
  category?: string;
}

export interface DateRange {
  startDate?: Date | string;
  endDate?: Date | string;
}

// Application-specific enums
export enum UserRole {
  ADMIN = 'admin',
  SENSEI = 'sensei',
  CUSTOMER = 'customer',
  MODERATOR = 'moderator'
}

export enum TripStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  PARTIAL = 'partial'
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum AlertType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error'
}

// Component prop types
export interface LoadingStateProps {
  loading: boolean;
  error?: string | Error;
  retry?: () => void;
}

export interface ComponentBaseProps {
  className?: string;
  children?: React.ReactNode;
  id?: string;
}

export interface DataTableProps<T> extends ComponentBaseProps {
  data: T[];
  columns: string[];
  loading?: boolean;
  pagination?: PaginationParams;
  sorting?: SortParams;
  filtering?: FilterParams;
  onRowClick?: (item: T) => void;
  onSort?: (params: SortParams) => void;
  onFilter?: (params: FilterParams) => void;
}