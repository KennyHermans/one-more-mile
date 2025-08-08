import React, { useState } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Textarea } from './textarea';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Label } from './label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

import { ProgramDay } from '@/types/trip';

interface TripProposalFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  senseiId?: string;
}

export function TripProposalForm({ onSuccess, onCancel, senseiId }: TripProposalFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    destination: '',
    description: '',
    price: '',
    dates: '',
    duration_days: 7,
    group_size: '',
    theme: '',
    difficulty_level: 'Moderate',
    max_participants: 12,
    image_url: '',
    requirements: [''],
    included_amenities: [''],
    excluded_items: [''],
  });
  const [program, setProgram] = useState<ProgramDay[]>([
    { day: 1, title: '', description: '', activities: [''] }
  ]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayChange = (field: string, index: number, value: string) => {
    const newArray = [...(formData[field as keyof typeof formData] as string[])];
    newArray[index] = value;
    setFormData(prev => ({ ...prev, [field]: newArray }));
  };

  const addArrayItem = (field: string) => {
    const newArray = [...(formData[field as keyof typeof formData] as string[]), ''];
    setFormData(prev => ({ ...prev, [field]: newArray }));
  };

  const removeArrayItem = (field: string, index: number) => {
    const newArray = (formData[field as keyof typeof formData] as string[]).filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, [field]: newArray }));
  };

  const addProgramDay = () => {
    setProgram(prev => [...prev, { day: prev.length + 1, title: '', description: '', activities: [''] }]);
  };

  const updateProgramDay = (dayIndex: number, field: 'title' | 'description', value: string) => {
    setProgram(prev => prev.map((day, i) => 
      i === dayIndex ? { ...day, [field]: value } : day
    ));
  };

  const addActivity = (dayIndex: number) => {
    setProgram(prev => prev.map((day, i) => 
      i === dayIndex ? { ...day, activities: [...day.activities, ''] } : day
    ));
  };

  const updateActivity = (dayIndex: number, activityIndex: number, value: string) => {
    setProgram(prev => prev.map((day, i) => 
      i === dayIndex ? {
        ...day,
        activities: day.activities.map((activity, j) => 
          j === activityIndex ? value : activity
        )
      } : day
    ));
  };

  const removeActivity = (dayIndex: number, activityIndex: number) => {
    setProgram(prev => prev.map((day, i) => 
      i === dayIndex ? {
        ...day,
        activities: day.activities.filter((_, j) => j !== activityIndex)
      } : day
    ));
  };

  const handleSubmit = async (isDraft: boolean = false) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please log in to create a trip proposal.",
          variant: "destructive",
        });
        return;
      }

      // Get sensei profile if not provided
      let finalSenseiId = senseiId;
      if (!finalSenseiId) {
        const { data: senseiProfile } = await supabase
          .from('sensei_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();
        
        if (!senseiProfile) {
          toast({
            title: "Sensei profile required",
            description: "You need to have a Sensei profile to create trip proposals.",
            variant: "destructive",
          });
          return;
        }
        finalSenseiId = senseiProfile.id;
      }

      const tripData = {
        ...formData,
        sensei_id: finalSenseiId,
        sensei_name: user.user_metadata.full_name || user.email,
        trip_status: isDraft ? 'draft' : 'review',
        created_by_sensei: true,
        created_by_user_id: user.id,
        current_participants: 0,
        is_active: false, // Will be set to true when approved
        program: JSON.stringify(program),
        requirements: formData.requirements.filter(r => r.trim() !== ''),
        included_amenities: formData.included_amenities.filter(a => a.trim() !== ''),
        excluded_items: formData.excluded_items.filter(e => e.trim() !== ''),
      };

      const { error } = await supabase
        .from('trips')
        .insert([tripData]);

      if (error) throw error;

      toast({
        title: "Trip proposal created",
        description: `Your trip proposal has been ${isDraft ? 'saved as draft' : 'submitted for review'}.`,
      });

      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating trip proposal:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create trip proposal",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="gradient-text">Create Trip Proposal</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="title">Trip Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter trip title"
            />
          </div>
          <div>
            <Label htmlFor="destination">Destination</Label>
            <Input
              id="destination"
              value={formData.destination}
              onChange={(e) => handleInputChange('destination', e.target.value)}
              placeholder="Enter destination"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Describe your trip..."
            rows={4}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="price">Price</Label>
            <Input
              id="price"
              value={formData.price}
              onChange={(e) => handleInputChange('price', e.target.value)}
              placeholder="e.g., $2,500"
            />
          </div>
          <div>
            <Label htmlFor="dates">Dates</Label>
            <Input
              id="dates"
              value={formData.dates}
              onChange={(e) => handleInputChange('dates', e.target.value)}
              placeholder="e.g., March 15-22, 2024"
            />
          </div>
          <div>
            <Label htmlFor="duration_days">Duration (Days)</Label>
            <Input
              id="duration_days"
              type="number"
              value={formData.duration_days}
              onChange={(e) => handleInputChange('duration_days', parseInt(e.target.value))}
              min="1"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="group_size">Group Size</Label>
            <Input
              id="group_size"
              value={formData.group_size}
              onChange={(e) => handleInputChange('group_size', e.target.value)}
              placeholder="e.g., 8-12 people"
            />
          </div>
          <div>
            <Label htmlFor="theme">Theme</Label>
            <Input
              id="theme"
              value={formData.theme}
              onChange={(e) => handleInputChange('theme', e.target.value)}
              placeholder="e.g., Adventure, Cultural, Wellness"
            />
          </div>
          <div>
            <Label htmlFor="difficulty_level">Difficulty Level</Label>
            <Select onValueChange={(value) => handleInputChange('difficulty_level', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Easy">Easy</SelectItem>
                <SelectItem value="Moderate">Moderate</SelectItem>
                <SelectItem value="Challenging">Challenging</SelectItem>
                <SelectItem value="Extreme">Extreme</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="image_url">Image URL</Label>
          <Input
            id="image_url"
            value={formData.image_url}
            onChange={(e) => handleInputChange('image_url', e.target.value)}
            placeholder="Enter image URL"
          />
        </div>

        {/* Requirements */}
        <div>
          <Label>Requirements</Label>
          {formData.requirements.map((requirement, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <Input
                value={requirement}
                onChange={(e) => handleArrayChange('requirements', index, e.target.value)}
                placeholder="Enter requirement"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => removeArrayItem('requirements', index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => addArrayItem('requirements')}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Requirement
          </Button>
        </div>

        {/* Program */}
        <div>
          <Label>Daily Program</Label>
          {program.map((day, dayIndex) => (
            <Card key={dayIndex} className="mb-4">
              <CardContent className="pt-4">
                <div className="mb-2">
                  <Label>Day {day.day} Title</Label>
                  <Input
                    value={day.title}
                    onChange={(e) => updateProgramDay(dayIndex, 'title', e.target.value)}
                    placeholder="Enter day title"
                  />
                </div>
                <div className="mb-2">
                  <Label>Day {day.day} Description</Label>
                  <Input
                    value={day.description}
                    onChange={(e) => updateProgramDay(dayIndex, 'description', e.target.value)}
                    placeholder="Enter day description"
                  />
                </div>
                <Label>Activities</Label>
                {day.activities.map((activity, activityIndex) => (
                  <div key={activityIndex} className="flex gap-2 mb-2">
                    <Input
                      value={typeof activity === 'string' ? activity : activity.name}
                      onChange={(e) => updateActivity(dayIndex, activityIndex, e.target.value)}
                      placeholder="Enter activity"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeActivity(dayIndex, activityIndex)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addActivity(dayIndex)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Activity
                </Button>
              </CardContent>
            </Card>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={addProgramDay}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Day
          </Button>
        </div>

        <div className="flex gap-4 justify-end">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
          )}
          <Button 
            variant="secondary" 
            onClick={() => handleSubmit(true)} 
            disabled={loading}
          >
            Save as Draft
          </Button>
          <Button onClick={() => handleSubmit(false)} disabled={loading}>
            Submit for Review
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}