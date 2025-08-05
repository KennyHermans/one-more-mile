import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, Save } from "lucide-react";
import { Trip } from '@/types/trip';

interface TripEditDialogProps {
  trip: Trip | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  onTripChange: (trip: Trip) => void;
  canEdit: (tripId: string, field: string) => boolean;
  isSaving?: boolean;
}

export function TripEditDialog({
  trip,
  isOpen,
  onClose,
  onSave,
  onTripChange,
  canEdit,
  isSaving = false
}: TripEditDialogProps) {
  if (!trip) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Trip: {trip.title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Trip Title</Label>
              <Input 
                value={trip.title}
                onChange={(e) => onTripChange({...trip, title: e.target.value})}
                disabled={!canEdit(trip.id, 'title')}
              />
              {!canEdit(trip.id, 'title') && (
                <p className="text-xs text-muted-foreground mt-1">You don't have permission to edit this field</p>
              )}
            </div>
            <div>
              <Label>Destination</Label>
              <Input 
                value={trip.destination}
                onChange={(e) => onTripChange({...trip, destination: e.target.value})}
                disabled={!canEdit(trip.id, 'destination')}
              />
              {!canEdit(trip.id, 'destination') && (
                <p className="text-xs text-muted-foreground mt-1">You don't have permission to edit this field</p>
              )}
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea 
              value={trip.description}
              onChange={(e) => onTripChange({...trip, description: e.target.value})}
              disabled={!canEdit(trip.id, 'description')}
            />
            {!canEdit(trip.id, 'description') && (
              <p className="text-xs text-muted-foreground mt-1">You don't have permission to edit this field</p>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={onSave} disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}