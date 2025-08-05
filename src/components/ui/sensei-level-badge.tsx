import { Badge } from "@/components/ui/badge";
import { Crown, Star, Shield } from "lucide-react";

interface SenseiLevelBadgeProps {
  level: 'apprentice' | 'journey_guide' | 'master_sensei';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export const SenseiLevelBadge = ({ 
  level, 
  size = 'md', 
  showIcon = true,
  className = "" 
}: SenseiLevelBadgeProps) => {
  const getLevelConfig = () => {
    switch (level) {
      case 'apprentice':
        return {
          label: 'Apprentice Sensei',
          icon: Shield,
          variant: 'secondary' as const,
          color: 'hsl(var(--muted-foreground))'
        };
      case 'journey_guide':
        return {
          label: 'Journey Guide',
          icon: Star,
          variant: 'default' as const,
          color: 'hsl(var(--primary))'
        };
      case 'master_sensei':
        return {
          label: 'Master Sensei',
          icon: Crown,
          variant: 'outline' as const,
          color: 'hsl(var(--accent))'
        };
      default:
        return {
          label: 'Unknown',
          icon: Shield,
          variant: 'secondary' as const,
          color: 'hsl(var(--muted-foreground))'
        };
    }
  };

  const config = getLevelConfig();
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <Badge 
      variant={config.variant}
      className={`${sizeClasses[size]} ${className}`}
      style={{ borderColor: config.color }}
    >
      {showIcon && (
        <Icon 
          className={`${iconSizes[size]} mr-1`} 
          style={{ color: config.color }}
        />
      )}
      <span style={{ color: config.color }}>
        {config.label}
      </span>
    </Badge>
  );
};