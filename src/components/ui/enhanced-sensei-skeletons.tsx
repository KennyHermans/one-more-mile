import { Skeleton, SkeletonText, SkeletonAvatar, SkeletonButton, SkeletonCard } from "./skeleton";
import { Card, CardContent, CardHeader } from "./card";

export function EnhancedSenseiCardSkeleton() {
  return (
    <Card className="group overflow-hidden animate-fade-in hover:shadow-lg transition-shadow duration-300">
      {/* Profile Image */}
      <div className="relative h-48 overflow-hidden">
        <Skeleton className="w-full h-full" />
        {/* Status Badge */}
        <div className="absolute top-4 right-4">
          <Skeleton className="h-6 w-16 rounded-full bg-white/20" />
        </div>
      </div>
      
      <CardHeader className="text-center space-y-3">
        <Skeleton className="h-6 w-32 mx-auto" />
        <Skeleton className="h-4 w-24 mx-auto" />
      </CardHeader>
      
      <CardContent className="space-y-4">
        <SkeletonText lines={3} />
        
        {/* Specialties */}
        <div className="flex flex-wrap gap-2 justify-center">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-14 rounded-full" />
        </div>
        
        {/* Stats */}
        <div className="flex justify-between text-center">
          <div className="space-y-1">
            <Skeleton className="h-4 w-4 mx-auto" />
            <Skeleton className="h-4 w-12 mx-auto" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-4 w-4 mx-auto" />
            <Skeleton className="h-4 w-16 mx-auto" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-4 w-4 mx-auto" />
            <Skeleton className="h-4 w-12 mx-auto" />
          </div>
        </div>
        
        <SkeletonButton className="w-full" />
      </CardContent>
    </Card>
  );
}

export function SenseiProfileHeaderSkeleton() {
  return (
    <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-8 rounded-lg animate-fade-in">
      <div className="flex flex-col md:flex-row items-center space-y-6 md:space-y-0 md:space-x-8">
        <SkeletonAvatar size="xl" className="h-32 w-32" />
        <div className="flex-1 text-center md:text-left space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48 mx-auto md:mx-0" />
            <Skeleton className="h-5 w-32 mx-auto md:mx-0" />
          </div>
          <SkeletonText lines={2} />
          <div className="flex flex-wrap justify-center md:justify-start gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SenseiStatsCardSkeleton() {
  return (
    <SkeletonCard>
      <Skeleton className="h-6 w-32" />
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center space-y-2">
          <Skeleton className="h-8 w-12 mx-auto" />
          <Skeleton className="h-4 w-16 mx-auto" />
        </div>
        <div className="text-center space-y-2">
          <Skeleton className="h-8 w-12 mx-auto" />
          <Skeleton className="h-4 w-20 mx-auto" />
        </div>
      </div>
    </SkeletonCard>
  );
}