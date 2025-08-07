import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Lock, Eye, Edit2, AlertCircle, Crown, Star, Shield } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { usePermissionValidator } from "@/hooks/use-permission-validator";
import { cn } from "@/lib/utils";

interface EnhancedPermissionAwareFieldProps {
  fieldName: string;
  senseiId?: string;
  tripId?: string;
  children: React.ReactElement;
  label?: string;
  description?: string;
  showPermissionLevel?: boolean;
  autoValidate?: boolean;
  onPermissionChange?: (hasPermission: boolean) => void;
  className?: string;
}

const getLevelIcon = (level: string) => {
  switch (level) {
    case 'apprentice': return Shield;
    case 'journey_guide': return Star;
    case 'master_sensei': return Crown;
    default: return Lock;
  }
};

const getLevelColor = (level: string) => {
  switch (level) {
    case 'apprentice': return 'text-muted-foreground';
    case 'journey_guide': return 'text-primary';
    case 'master_sensei': return 'text-accent-foreground';
    default: return 'text-muted-foreground';
  }
};

const getLevelDisplayName = (level: string) => {
  switch (level) {
    case 'apprentice': return 'Apprentice Sensei';
    case 'journey_guide': return 'Journey Guide';
    case 'master_sensei': return 'Master Sensei';
    default: return level;
  }
};

export const EnhancedPermissionAwareField: React.FC<EnhancedPermissionAwareFieldProps> = ({
  fieldName,
  senseiId,
  tripId,
  children,
  label,
  description,
  showPermissionLevel = true,
  autoValidate = true,
  onPermissionChange,
  className
}) => {
  const { validateSenseiPermissions, validateTripPermissions, isValidating } = usePermissionValidator();
  const [permissionState, setPermissionState] = useState<{
    canView: boolean;
    canEdit: boolean;
    currentLevel: string | null;
    requiredLevel?: string;
    isLoading: boolean;
  }>({
    canView: true,
    canEdit: true,
    currentLevel: null,
    isLoading: autoValidate
  });

  useEffect(() => {
    if (!autoValidate || !senseiId) {
      setPermissionState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    const validatePermissions = async () => {
      try {
        let result;
        if (tripId) {
          result = await validateTripPermissions({
            senseiId,
            tripId,
            fieldName
          });
        } else {
          result = await validateSenseiPermissions({
            senseiId,
            fieldName
          });
        }

        const fieldPermission = result.fieldPermissions[fieldName];
        const newState = {
          canView: fieldPermission?.canView !== false,
          canEdit: fieldPermission?.canEdit !== false,
          currentLevel: result.senseiLevel,
          requiredLevel: fieldPermission?.requiredLevel,
          isLoading: false
        };

        setPermissionState(newState);
        onPermissionChange?.(newState.canEdit);
      } catch (error) {
        console.error('Error validating field permissions:', error);
        setPermissionState(prev => ({ 
          ...prev, 
          canView: false, 
          canEdit: false, 
          isLoading: false 
        }));
        onPermissionChange?.(false);
      }
    };

    validatePermissions();
  }, [
    autoValidate, 
    senseiId, 
    tripId, 
    fieldName, 
    validateSenseiPermissions, 
    validateTripPermissions, 
    onPermissionChange
  ]);

  const { canView, canEdit, currentLevel, requiredLevel, isLoading } = permissionState;

  // Don't render anything if user can't view the field
  if (!canView && !isLoading) {
    return null;
  }

  const LevelIcon = getLevelIcon(requiredLevel || currentLevel || '');
  const isFieldLocked = !canEdit && !isLoading;

  return (
    <TooltipProvider>
      <div className={cn("relative space-y-2", className)}>
        {/* Label with permission indicators */}
        {label && (
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium">
              {label}
              {description && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertCircle className="inline h-3 w-3 ml-1 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">{description}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </label>
            
            {showPermissionLevel && (
              <div className="flex items-center gap-2">
                {/* Current permission indicator */}
                <div className="flex items-center gap-1">
                  {canEdit ? (
                    <Edit2 className="h-3 w-3 text-green-500" />
                  ) : canView ? (
                    <Eye className="h-3 w-3 text-yellow-500" />
                  ) : (
                    <Lock className="h-3 w-3 text-red-500" />
                  )}
                </div>

                {/* Level requirement badge */}
                {(requiredLevel || currentLevel) && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="text-xs h-5 px-1">
                        <LevelIcon className={cn("h-3 w-3 mr-1", getLevelColor(requiredLevel || currentLevel || ''))} />
                        {getLevelDisplayName(requiredLevel || currentLevel || '').split(' ')[0]}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        {requiredLevel && (
                          <p>Required: {getLevelDisplayName(requiredLevel)}</p>
                        )}
                        {currentLevel && (
                          <p>Current: {getLevelDisplayName(currentLevel)}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {canEdit ? 'Can edit this field' : canView ? 'Can view only' : 'No access'}
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            )}
          </div>
        )}

        {/* Field wrapper */}
        <div className="relative">
          {React.cloneElement(children, {
            disabled: isFieldLocked || isLoading || children.props.disabled,
            className: cn(
              children.props.className || '',
              isFieldLocked && 'bg-muted/50 cursor-not-allowed opacity-75',
              isLoading && 'animate-pulse'
            ),
            placeholder: isFieldLocked 
              ? `${children.props.placeholder || 'Field'} (Locked - requires ${getLevelDisplayName(requiredLevel || 'higher level')})`
              : children.props.placeholder
          })}
          
          {/* Overlay for locked fields */}
          {isFieldLocked && (
            <div className="absolute inset-0 bg-muted/10 rounded-md pointer-events-none flex items-center justify-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="bg-background/80 rounded-full p-1 border shadow-sm">
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    <p className="font-medium">Field Locked</p>
                    {requiredLevel && (
                      <p>Requires: {getLevelDisplayName(requiredLevel)}</p>
                    )}
                    {currentLevel && (
                      <p>Your level: {getLevelDisplayName(currentLevel)}</p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        {/* Permission upgrade hint */}
        {isFieldLocked && requiredLevel && currentLevel && currentLevel !== requiredLevel && (
          <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2 border">
            <div className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              <span>
                Upgrade to {getLevelDisplayName(requiredLevel)} to edit this field
              </span>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};