import React from 'react';
import { TripCreationManager } from './trip-creation-manager';

interface SenseiDashboardTabsProps {
  activeTab: string;
  senseiId: string;
  onSuccess?: () => void;
}

export function SenseiDashboardTabs({ activeTab, senseiId, onSuccess }: SenseiDashboardTabsProps) {
  switch (activeTab) {
    case "create-trip":
      return (
        <TripCreationManager 
          senseiId={senseiId}
          mode="create-trip"
          onSuccess={onSuccess}
        />
      );
      
    case "ai-builder":
      return (
        <TripCreationManager 
          senseiId={senseiId}
          mode="ai-builder"
          onSuccess={onSuccess}
        />
      );
      
    default:
      return null;
  }
}