import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Lock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PermissionAwareFieldProps {
  fieldName: string;
  canEdit: boolean;
  currentLevel?: 'apprentice' | 'journey_guide' | 'master_sensei' | null;
  requiredLevel?: 'apprentice' | 'journey_guide' | 'master_sensei';
  children: React.ReactElement;
  label?: string;
  isAdmin?: boolean;
}

export const PermissionAwareField: React.FC<PermissionAwareFieldProps> = ({
  fieldName,
  canEdit,
  currentLevel,
  requiredLevel,
  children,
  label,
  isAdmin = false
}) => {
  const getLevelDisplayName = (level: string) => {
    switch (level) {
      case 'apprentice': return 'Apprentice Sensei';
      case 'journey_guide': return 'Journey Guide';
      case 'master_sensei': return 'Master Sensei';
      default: return level;
    }
  };

  // Admins can edit any field, bypass restrictions
  if (isAdmin || canEdit) {
    return (
      <div>
        {label && <label className="block text-sm font-medium mb-2">{label}</label>}
        {children}
      </div>
    );
  }

  // Field is locked
  return (
    <div className="relative">
      <div className="flex items-center gap-2 mb-2">
        {label && <label className="block text-sm font-medium">{label}</label>}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" />
                <span>Locked</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {requiredLevel 
                  ? `Requires ${getLevelDisplayName(requiredLevel)} level or higher`
                  : 'Field locked based on your current permissions'
                }
              </p>
              {currentLevel && requiredLevel && (
                <p className="text-xs mt-1">
                  Current level: {getLevelDisplayName(currentLevel)}
                </p>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {React.cloneElement(children, {
        disabled: true,
        className: `${children.props.className || ''} bg-muted/50 cursor-not-allowed`,
        placeholder: children.props.placeholder ? `${children.props.placeholder} (Locked)` : 'Field locked'
      })}
      
      <div className="absolute inset-0 bg-muted/10 rounded-md pointer-events-none flex items-center justify-center">
        <div className="bg-background/80 rounded-full p-2">
          <Lock className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
};