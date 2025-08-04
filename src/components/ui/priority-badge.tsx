import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type Priority = "urgent" | "high" | "medium" | "low";

interface PriorityBadgeProps {
  priority: Priority;
  count?: number;
  className?: string;
}

export function PriorityBadge({ priority, count, className }: PriorityBadgeProps) {
  const variants = {
    urgent: "bg-destructive text-destructive-foreground hover:bg-destructive/80",
    high: "bg-warning text-warning-foreground hover:bg-warning/90",
    medium: "bg-info text-info-foreground hover:bg-info/90",
    low: "bg-muted text-muted-foreground hover:bg-muted/80"
  };

  if (!count || count === 0) return null;

  return (
    <Badge 
      variant="outline" 
      className={cn(variants[priority], "text-xs font-medium", className)}
    >
      {count}
    </Badge>
  );
}