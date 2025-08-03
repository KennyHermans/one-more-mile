import { Skeleton, SkeletonText, SkeletonAvatar, SkeletonButton, SkeletonCard } from "./skeleton";

export function SearchFiltersSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Search Bar */}
      <Skeleton className="h-12 w-full rounded-lg" />
      
      {/* Quick Filters */}
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-20 rounded-full" />
        <Skeleton className="h-9 w-28 rounded-full" />
        <Skeleton className="h-9 w-16 rounded-full" />
        <Skeleton className="h-9 w-22 rounded-full" />
      </div>
      
      {/* Results Count */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-40" />
      </div>
    </div>
  );
}

export function DashboardHeaderSkeleton() {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-5 w-48" />
      </div>
      <div className="flex gap-3">
        <SkeletonButton />
        <SkeletonButton />
      </div>
    </div>
  );
}

export function StatsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonCard key={i}>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-12" />
            </div>
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </SkeletonCard>
      ))}
    </div>
  );
}

export function DataTableSkeleton({ 
  rows = 5,
  columns = 4 
}: { 
  rows?: number;
  columns?: number;
}) {
  return (
    <SkeletonCard className="p-0">
      {/* Table Header */}
      <div className="p-4 border-b border-border">
        <div className="flex space-x-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      </div>
      
      {/* Table Rows */}
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex space-x-4">
            {Array.from({ length: columns }).map((_, j) => (
              <Skeleton key={j} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </SkeletonCard>
  );
}

export function NotificationSkeleton() {
  return (
    <div className="flex space-x-3 p-4 border border-border rounded-lg animate-fade-in">
      <SkeletonAvatar size="sm" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-4 w-12" />
    </div>
  );
}

export function MessageSkeleton() {
  return (
    <div className="flex space-x-3 p-3 animate-fade-in">
      <SkeletonAvatar size="sm" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <SkeletonCard>
      <Skeleton className="h-6 w-32" />
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-20 w-full" />
        </div>
        <div className="flex justify-end space-x-3">
          <SkeletonButton />
          <SkeletonButton />
        </div>
      </div>
    </SkeletonCard>
  );
}