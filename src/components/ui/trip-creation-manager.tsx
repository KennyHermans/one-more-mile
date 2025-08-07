import React from 'react';
import { Card, CardContent } from './card';
import { Button } from './button';
import { Badge } from './badge';
import { Plus, Wand2 } from 'lucide-react';
import { useSenseiPermissions } from '@/hooks/use-sensei-permissions';
import { TripProposalForm } from './trip-proposal-form';
import { PermissionAwareAiTripBuilder } from './permission-aware-ai-trip-builder';

interface TripCreationManagerProps {
  senseiId: string;
  mode: 'create-trip' | 'ai-builder';
  onSuccess?: () => void;
}

export function TripCreationManager({ senseiId, mode, onSuccess }: TripCreationManagerProps) {
  const { permissions, isLoading } = useSenseiPermissions(senseiId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">Loading permissions...</p>
        </CardContent>
      </Card>
    );
  }

  if (mode === 'ai-builder' && !permissions?.can_use_ai_builder) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <div className="space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
              <Wand2 className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">AI Builder - Master Sensei Feature</h3>
              <p className="text-muted-foreground mb-4">
                The AI Trip Builder is exclusive to Master Sensei level. 
                Continue building your expertise and ratings to unlock this powerful feature.
              </p>
              <Badge variant="outline" className="px-4 py-2">
                Master Sensei Required
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (mode === 'create-trip' && !permissions?.can_create_trips) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <div className="space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
              <Plus className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Trip Creation - Journey Guide Feature</h3>
              <p className="text-muted-foreground mb-4">
                Trip creation is available starting at Journey Guide level. 
                Lead more trips and improve your ratings to unlock this feature.
              </p>
              <Badge variant="outline" className="px-4 py-2">
                Journey Guide Required
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (mode === 'ai-builder') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Wand2 className="h-6 w-6" />
              AI Trip Builder
            </h2>
            <p className="text-muted-foreground">Use AI to create amazing trip proposals effortlessly</p>
          </div>
          <Badge variant="secondary" className="text-sm">
            Master Sensei Feature
          </Badge>
        </div>
        
        <PermissionAwareAiTripBuilder 
          senseiId={senseiId}
          onSuccess={onSuccess}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Plus className="h-6 w-6" />
            Create Trip
          </h2>
          <p className="text-muted-foreground">Design your next adventure for travelers</p>
        </div>
        <Badge variant="secondary" className="text-sm">
          Journey Guide Feature
        </Badge>
      </div>
      
      <TripProposalForm 
        senseiId={senseiId}
        onSuccess={onSuccess}
      />
    </div>
  );
}