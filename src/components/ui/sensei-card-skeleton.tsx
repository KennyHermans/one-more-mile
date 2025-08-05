import { Card, CardContent, CardHeader } from "./card";
import { Skeleton } from "./skeleton";

export function SenseiCardSkeleton() {
  return (
    <Card className="overflow-hidden animate-pulse">
      <div className="relative h-40">
        <Skeleton className="w-full h-full" />
      </div>
      
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-32 mx-auto" />
        <Skeleton className="h-3 w-24 mx-auto" />
      </CardHeader>
      
      <CardContent className="space-y-3 pt-0">
        <div className="space-y-1">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
        
        <div className="flex flex-wrap gap-1">
          <Skeleton className="h-5 w-12 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-10 rounded-full" />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <Skeleton className="h-3 w-3" />
            <Skeleton className="h-3 w-10" />
          </div>
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}