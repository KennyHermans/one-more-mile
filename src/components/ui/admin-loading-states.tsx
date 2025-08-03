import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export function AdminLoadingStates() {
  return {
    StatsCardSkeleton: () => (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </div>
            <Skeleton className="h-12 w-12 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    ),

    ApplicationCardSkeleton: () => (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-60" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <div className="flex gap-1">
                  <Skeleton className="h-6 w-12" />
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-14" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    ),

    TableSkeleton: ({ rows = 5, columns = 4 }) => (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="grid grid-cols-4 gap-4">
                {Array.from({ length: columns }).map((_, j) => (
                  <Skeleton key={j} className="h-4 w-full" />
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    ),

    EmptyState: ({ 
      icon: Icon, 
      title, 
      description, 
      action 
    }: {
      icon: React.ComponentType<any>;
      title: string;
      description: string;
      action?: React.ReactNode;
    }) => (
      <Card>
        <CardContent className="pt-12 pb-12 text-center">
          <Icon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <p className="text-muted-foreground mb-4 max-w-sm mx-auto">{description}</p>
          {action}
        </CardContent>
      </Card>
    ),

    ErrorState: ({ 
      title = "Something went wrong", 
      description = "Failed to load data. Please try again.", 
      onRetry 
    }: {
      title?: string;
      description?: string;
      onRetry?: () => void;
    }) => (
      <Card className="border-destructive/20">
        <CardContent className="pt-12 pb-12 text-center">
          <div className="h-12 w-12 mx-auto bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <svg className="h-6 w-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <p className="text-muted-foreground mb-4">{description}</p>
          {onRetry && (
            <button 
              onClick={onRetry}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
          )}
        </CardContent>
      </Card>
    ),

    RefreshIndicator: ({ isRefreshing }: { isRefreshing: boolean }) => (
      isRefreshing ? (
        <div className="fixed top-4 right-4 z-50">
          <Badge variant="secondary" className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
            Refreshing...
          </Badge>
        </div>
      ) : null
    )
  };
}