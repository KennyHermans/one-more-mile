import { Skeleton, SkeletonText, SkeletonAvatar, SkeletonButton, SkeletonCard } from "./skeleton";
import { Card, CardContent, CardHeader } from "./card";

export function EnhancedTripCardSkeleton() {
  return (
    <Card className="group overflow-hidden animate-fade-in">
      {/* Image Skeleton */}
      <div className="relative h-64 overflow-hidden">
        <Skeleton className="w-full h-full" />
        {/* Theme Badge */}
        <div className="absolute top-4 left-4">
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        {/* Rating Badge */}
        <div className="absolute top-4 right-4">
          <Skeleton className="h-8 w-16 rounded-full" />
        </div>
        {/* Location */}
        <div className="absolute bottom-4 left-4">
          <Skeleton className="h-5 w-24" />
        </div>
      </div>
      
      <CardHeader className="space-y-3">
        <Skeleton className="h-7 w-3/4" />
        <SkeletonText lines={2} />
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Trip Details */}
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-16" />
          </div>
        </div>
        
        {/* Sensei and Price */}
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="text-right space-y-1">
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-6 w-16" />
          </div>
        </div>
        
        <SkeletonButton className="w-full" />
      </CardContent>
    </Card>
  );
}

export function CompactTripCardSkeleton() {
  return (
    <div className="flex bg-card border border-border rounded-lg p-3 space-x-3 animate-fade-in">
      <Skeleton className="w-16 h-16 rounded-md flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <div className="flex justify-between items-center">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>
    </div>
  );
}

export function TripDetailSkeleton() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Image */}
      <div className="relative h-[60vh] overflow-hidden rounded-lg">
        <Skeleton className="w-full h-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-8 left-8 space-y-4">
          <Skeleton className="h-8 w-20 rounded-full bg-white/20" />
          <Skeleton className="h-12 w-96 bg-white/20" />
          <div className="flex space-x-4">
            <Skeleton className="h-6 w-32 bg-white/20" />
            <Skeleton className="h-6 w-16 bg-white/20" />
          </div>
        </div>
      </div>
      
      <div className="container grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <SkeletonText lines={4} />
          </div>
          
          {/* Tabs Skeleton */}
          <div className="space-y-6">
            <div className="flex space-x-4">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-10 w-20" />
            </div>
            <SkeletonCard>
              <SkeletonText lines={6} />
            </SkeletonCard>
          </div>
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          <SkeletonCard>
            <Skeleton className="h-6 w-32" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-8 w-24" />
            </div>
          </SkeletonCard>
          
          <SkeletonCard>
            <div className="flex items-center space-x-3">
              <SkeletonAvatar size="lg" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </SkeletonCard>
        </div>
      </div>
    </div>
  );
}