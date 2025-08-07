import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Crown, Clock } from "lucide-react";

interface ElevatedPermissionsIndicatorProps {
  currentLevel: string;
  elevatedLevel: string;
  tripTitle?: string;
  className?: string;
}

export const ElevatedPermissionsIndicator = ({ 
  currentLevel, 
  elevatedLevel, 
  tripTitle,
  className 
}: ElevatedPermissionsIndicatorProps) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className={`bg-amber-100 text-amber-800 hover:bg-amber-200 ${className}`}>
            <Crown className="h-3 w-3 mr-1" />
            <Clock className="h-3 w-3 mr-1" />
            Temporary {elevatedLevel}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">
          <div className="space-y-1">
            <p className="font-medium">Elevated Permissions Active</p>
            <p className="text-sm text-muted-foreground">
              Your level: <span className="font-medium capitalize">{currentLevel}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Elevated to: <span className="font-medium capitalize">{elevatedLevel}</span>
            </p>
            {tripTitle && (
              <p className="text-sm text-muted-foreground">
                For trip: <span className="font-medium">{tripTitle}</span>
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              These permissions apply only to this trip and allow you to manage it fully.
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};