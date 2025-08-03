import { useState } from "react";
import { HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HelpItem {
  id: string;
  title: string;
  content: string;
  type: "tooltip" | "guide" | "video";
  url?: string;
}

interface ContextualHelpProps {
  helpItems: HelpItem[];
  context: string;
  className?: string;
}

export function ContextualHelp({ helpItems, context, className }: ContextualHelpProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const tooltipItems = helpItems.filter(item => item.type === "tooltip");
  const guideItems = helpItems.filter(item => item.type !== "tooltip");

  return (
    <TooltipProvider>
      <div className={className}>
        {/* Inline Help Tooltips */}
        {tooltipItems.map((item) => (
          <Tooltip key={item.id}>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-sm">{item.content}</p>
            </TooltipContent>
          </Tooltip>
        ))}

        {/* Expandable Help Section */}
        {guideItems.length > 0 && (
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="gap-2"
            >
              <HelpCircle className="h-4 w-4" />
              Need help with {context}?
            </Button>

            {isExpanded && (
              <Card className="absolute top-full right-0 mt-2 w-80 z-50 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm">Help & Guides</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(false)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {guideItems.map((item) => (
                    <div key={item.id} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium">{item.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {item.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {item.content}
                      </p>
                      {item.url && (
                        <Button variant="outline" size="sm" className="text-xs">
                          {item.type === "video" ? "Watch Tutorial" : "Read Guide"}
                        </Button>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

export function useContextualHelp(context: string): HelpItem[] {
  // This would typically fetch context-specific help items from an API
  const helpContexts: Record<string, HelpItem[]> = {
    overview: [
      {
        id: "overview-dashboard",
        title: "Dashboard Overview",
        content: "Your dashboard shows key metrics, upcoming trips, and important actions that need your attention.",
        type: "tooltip" as const
      },
      {
        id: "overview-quick-actions",
        title: "Quick Actions Guide",
        content: "Learn how to quickly book trips, update your profile, and manage your account from the overview page.",
        type: "guide" as const
      }
    ],
    trips: [
      {
        id: "trips-booking",
        title: "How to Book a Trip",
        content: "Step-by-step guide to booking your perfect trip with a qualified sensei.",
        type: "guide" as const
      },
      {
        id: "trips-calendar",
        title: "Calendar View",
        content: "Use the calendar to see all your upcoming trips and availability at a glance.",
        type: "tooltip" as const
      }
    ],
    profile: [
      {
        id: "profile-completion",
        title: "Complete Your Profile",
        content: "A complete profile helps us match you with the best senseis and experiences.",
        type: "guide" as const
      },
      {
        id: "profile-documents",
        title: "Document Upload",
        content: "Upload important travel documents and certifications for your trips.",
        type: "tooltip" as const
      }
    ]
  };

  return helpContexts[context] || [];
}