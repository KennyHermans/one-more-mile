import React, { memo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, MapPin } from 'lucide-react';

export const SenseiCardSkeleton = memo(() => (
  <Card>
    <CardHeader>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Skeleton className="h-6 w-3/4" />
          <div className="flex items-center gap-2 mt-1">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="w-12 h-12 rounded-full" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-16" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <Skeleton className="h-6 w-8 mx-auto" />
            <div className="text-xs text-muted-foreground mt-1">Trips</div>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1">
              <Star className="h-4 w-4 text-muted-foreground" />
              <Skeleton className="h-6 w-8" />
            </div>
            <div className="text-xs text-muted-foreground mt-1">Rating</div>
          </div>
          <div>
            <Skeleton className="h-6 w-4 mx-auto" />
            <div className="text-xs text-muted-foreground mt-1">Specialties</div>
          </div>
        </div>
        <Skeleton className="h-9 w-full" />
      </div>
    </CardContent>
  </Card>
));

SenseiCardSkeleton.displayName = 'SenseiCardSkeleton';