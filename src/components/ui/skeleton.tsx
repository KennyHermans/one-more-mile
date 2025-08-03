import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gradient-to-r from-muted via-muted/50 to-muted",
        "bg-[length:200%_100%] animate-[shimmer_2s_ease-in-out_infinite]",
        className
      )}
      {...props}
    />
  )
}

// Enhanced skeleton variants for different use cases
function SkeletonLine({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <Skeleton className={cn("h-4 w-full", className)} {...props} />
}

function SkeletonText({ 
  lines = 3, 
  className,
  ...props 
}: React.HTMLAttributes<HTMLDivElement> & { lines?: number }) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine 
          key={i} 
          className={cn(
            i === lines - 1 ? "w-3/4" : "w-full"
          )} 
        />
      ))}
    </div>
  )
}

function SkeletonAvatar({ 
  size = "md",
  className, 
  ...props 
}: React.HTMLAttributes<HTMLDivElement> & { 
  size?: "sm" | "md" | "lg" | "xl" 
}) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10", 
    lg: "h-12 w-12",
    xl: "h-16 w-16"
  }
  
  return (
    <Skeleton 
      className={cn("rounded-full", sizeClasses[size], className)} 
      {...props} 
    />
  )
}

function SkeletonButton({ 
  size = "md",
  className,
  ...props 
}: React.HTMLAttributes<HTMLDivElement> & { 
  size?: "sm" | "md" | "lg" 
}) {
  const sizeClasses = {
    sm: "h-8 w-20",
    md: "h-10 w-24",
    lg: "h-12 w-32"
  }
  
  return (
    <Skeleton 
      className={cn("rounded-md", sizeClasses[size], className)} 
      {...props} 
    />
  )
}

function SkeletonCard({ 
  children,
  className,
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn(
        "rounded-lg border border-border bg-card p-6 space-y-4 animate-fade-in",
        className
      )} 
      {...props}
    >
      {children}
    </div>
  )
}

export { 
  Skeleton, 
  SkeletonLine, 
  SkeletonText, 
  SkeletonAvatar, 
  SkeletonButton, 
  SkeletonCard 
}