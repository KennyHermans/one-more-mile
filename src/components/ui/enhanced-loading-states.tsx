import { Loader2, Plane, Mountain, Compass } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "default" | "primary" | "adventure";
  text?: string;
  className?: string;
}

export function LoadingSpinner({ 
  size = "md", 
  variant = "default",
  text,
  className 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8",
    xl: "h-12 w-12"
  };
  
  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg", 
    xl: "text-xl"
  };

  const Icon = variant === "adventure" ? Compass : Loader2;

  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <Icon 
        className={cn(
          "animate-spin",
          sizeClasses[size],
          {
            "text-muted-foreground": variant === "default",
            "text-primary": variant === "primary",
            "text-primary animate-pulse": variant === "adventure"
          }
        )} 
      />
      {text && (
        <p className={cn(
          "text-muted-foreground font-medium",
          textSizeClasses[size]
        )}>
          {text}
        </p>
      )}
    </div>
  );
}

export function PageLoadingState({ 
  title = "Loading...",
  subtitle,
  className 
}: {
  title?: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={cn(
      "min-h-[50vh] flex flex-col items-center justify-center space-y-6 animate-fade-in",
      className
    )}>
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
        <Mountain className="h-16 w-16 text-primary animate-bounce" />
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-serif font-bold">{title}</h2>
        {subtitle && (
          <p className="text-muted-foreground">{subtitle}</p>
        )}
      </div>
      <LoadingSpinner size="lg" variant="primary" />
    </div>
  );
}

export function AdventureLoadingState({ 
  message = "Preparing your adventure...",
  stage = "Loading"
}: {
  message?: string;
  stage?: string;
}) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-8 animate-fade-in">
      <div className="relative">
        {/* Animated Background Circle */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-full animate-pulse" />
        
        {/* Flying Plane Animation */}
        <div className="relative h-32 w-32 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
          <Plane className="h-12 w-12 text-primary animate-bounce" style={{
            animation: "bounce 2s infinite, float 3s ease-in-out infinite"
          }} />
        </div>
        
        {/* Orbiting Dots */}
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: "4s" }}>
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="h-2 w-2 bg-primary rounded-full" />
          </div>
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2">
            <div className="h-2 w-2 bg-accent rounded-full" />
          </div>
          <div className="absolute left-0 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="h-2 w-2 bg-primary rounded-full" />
          </div>
          <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2">
            <div className="h-2 w-2 bg-accent rounded-full" />
          </div>
        </div>
      </div>
      
      <div className="text-center space-y-3 max-w-md">
        <div className="flex items-center justify-center space-x-2">
          <span className="h-2 w-2 bg-primary rounded-full animate-pulse" />
          <span className="text-sm font-medium text-primary uppercase tracking-wider">{stage}</span>
          <span className="h-2 w-2 bg-primary rounded-full animate-pulse" />
        </div>
        <h2 className="text-2xl font-serif font-bold text-foreground">{message}</h2>
        <p className="text-muted-foreground">
          We're crafting the perfect experience for you
        </p>
      </div>
      
      {/* Progress Indicator */}
      <div className="w-64 bg-muted rounded-full h-2 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-primary to-accent rounded-full animate-pulse"
          style={{
            width: "60%",
            animation: "progress 2s ease-in-out infinite"
          }}
        />
      </div>
    </div>
  );
}

export function InlineLoadingState({ 
  text = "Loading...",
  size = "sm" 
}: {
  text?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <div className="flex items-center justify-center py-8">
      <LoadingSpinner size={size} text={text} />
    </div>
  );
}