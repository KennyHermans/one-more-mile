// Central export file for all types
export * from './common';
export * from './admin';
export * from './sensei';
export * from './trip';
export * from './customer';

// Re-export commonly used types for convenience
export type {
  ErrorContext,
  LogEntry,
  ApiResponse,
  PaginationParams,
  SortParams,
  FilterParams,
  LoadingStateProps,
  ComponentBaseProps
} from './common';

export type {
  AdminStats,
  AdminAlert,
  AdminRole,
  BackupRequest,
  AdminPermissions
} from './admin';

export type {
  SenseiProfile,
  SenseiLevel,
  SenseiCertificate,
  SenseiSkill,
  SenseiAchievement,
  SenseiPermissions
} from './sensei';

export type {
  Trip,
  TripBooking
} from './trip';

export type {
  CustomerProfile,
  CustomerWishlist,
  CustomerNotification,
  CustomerTravelStats,
  PaymentPlan
} from './customer';