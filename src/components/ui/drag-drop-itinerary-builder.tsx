import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  GripVertical, 
  Plus, 
  Trash2, 
  Copy, 
  MapPin, 
  Clock,
  Users,
  DollarSign
} from 'lucide-react';
import { ProgramDay } from '@/types/trip';

interface DragDropItineraryBuilderProps {
  program: ProgramDay[];
  onChange: (program: ProgramDay[]) => void;
  activitySuggestions?: any[];
  onAddFromLibrary?: (activity: any, dayIndex: number) => void;
}

interface SortableDayProps {
  day: ProgramDay;
  index: number;
  onUpdate: (index: number, updatedDay: ProgramDay) => void;
  onDelete: (index: number) => void;
  onDuplicate: (index: number) => void;
}

function SortableDay({ day, index, onUpdate, onDelete, onDuplicate }: SortableDayProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: day.day });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const updateDay = (field: string, value: any) => {
    onUpdate(index, { ...day, [field]: value });
  };

  const updateActivity = (activityIndex: number, field: string, value: any) => {
    const updatedActivities = [...(day.activities || [])];
    if (typeof updatedActivities[activityIndex] === 'string') {
      const activityName = updatedActivities[activityIndex] as string;
      updatedActivities[activityIndex] = { name: activityName, [field]: value } as any;
    } else {
      updatedActivities[activityIndex] = { ...(updatedActivities[activityIndex] as any), [field]: value };
    }
    updateDay('activities', updatedActivities);
  };

  const addActivity = () => {
    const activities = [...(day.activities || [])];
    activities.push({ name: '', time: '', duration: '', cost: '' } as any);
    updateDay('activities', activities);
  };

  const removeActivity = (activityIndex: number) => {
    const activities = [...(day.activities || [])];
    activities.splice(activityIndex, 1);
    updateDay('activities', activities);
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-4">
      <Card className={`border-l-4 border-l-primary ${isDragging ? 'shadow-lg' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div
              className="cursor-grab active:cursor-grabbing"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </div>
            
            <Badge variant="outline" className="px-2 py-1">
              Day {day.day}
            </Badge>
            
            <Input
              value={day.title || ''}
              onChange={(e) => updateDay('title', e.target.value)}
              placeholder="Day title"
              className="flex-1"
            />
            
            <div className="flex gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onDuplicate(index)}
                title="Duplicate day"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onDelete(index)}
                title="Delete day"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <Input
                value={day.location || ''}
                onChange={(e) => updateDay('location', e.target.value)}
                placeholder="Location"
                className="text-sm"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Input
                value={day.distance || ''}
                onChange={(e) => updateDay('distance', e.target.value)}
                placeholder="Distance/Duration"
                className="text-sm"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <Input
                value={day.estimated_cost || ''}
                onChange={(e) => updateDay('estimated_cost', e.target.value)}
                placeholder="Est. cost"
                className="text-sm"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Description</label>
            <RichTextEditor
              value={day.description || ''}
              onChange={(value) => updateDay('description', value)}
              placeholder="Describe the day's highlights and experiences..."
              className="min-h-[80px]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium">Activities</label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addActivity}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Activity
              </Button>
            </div>

            <div className="space-y-3">
              {(day.activities || []).map((activity, activityIndex) => {
                const activityObj = typeof activity === 'string' 
                  ? { name: activity, time: '', duration: '', cost: '' }
                  : activity;

                return (
                  <div key={activityIndex} className="border rounded-lg p-3 bg-muted/30">
                    <div className="flex items-start gap-2 mb-2">
                      <Input
                        value={activityObj.name}
                        onChange={(e) => updateActivity(activityIndex, 'name', e.target.value)}
                        placeholder="Activity name"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeActivity(activityIndex)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <Input
                        value={activityObj.time || ''}
                        onChange={(e) => updateActivity(activityIndex, 'time', e.target.value)}
                        placeholder="Time (e.g., 09:00)"
                        className="text-sm"
                      />
                      <Input
                        value={activityObj.duration || ''}
                        onChange={(e) => updateActivity(activityIndex, 'duration', e.target.value)}
                        placeholder="Duration (e.g., 2h)"
                        className="text-sm"
                      />
                      <Input
                        value={activityObj.cost || ''}
                        onChange={(e) => updateActivity(activityIndex, 'cost', e.target.value)}
                        placeholder="Cost (optional)"
                        className="text-sm"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function DragDropItineraryBuilder({ 
  program, 
  onChange, 
  activitySuggestions = [],
  onAddFromLibrary 
}: DragDropItineraryBuilderProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = program.findIndex(day => day.day === active.id);
      const newIndex = program.findIndex(day => day.day === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newProgram = arrayMove(program, oldIndex, newIndex);
        // Update day numbers to match new order
        const reorderedProgram = newProgram.map((day, index) => ({
          ...day,
          day: index + 1
        }));
        onChange(reorderedProgram);
      }
    }
  };

  const addDay = () => {
    const newDay: ProgramDay = {
      day: program.length + 1,
      title: `Day ${program.length + 1}`,
      location: '',
      activities: [],
      description: '',
      distance: '',
      estimated_cost: ''
    };
    onChange([...program, newDay]);
  };

  const updateDay = (index: number, updatedDay: ProgramDay) => {
    const newProgram = [...program];
    newProgram[index] = updatedDay;
    onChange(newProgram);
  };

  const deleteDay = (index: number) => {
    const newProgram = program.filter((_, i) => i !== index);
    // Renumber days
    const renumberedProgram = newProgram.map((day, i) => ({
      ...day,
      day: i + 1
    }));
    onChange(renumberedProgram);
  };

  const duplicateDay = (index: number) => {
    const dayToDuplicate = { ...program[index] };
    const newDay = {
      ...dayToDuplicate,
      day: program.length + 1,
      title: `${dayToDuplicate.title} (Copy)`
    };
    onChange([...program, newDay]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Trip Itinerary</h3>
        <Button onClick={addDay} variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Add Day
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={program.map(day => day.day)}
          strategy={verticalListSortingStrategy}
        >
          {program.map((day, index) => (
            <SortableDay
              key={day.day}
              day={day}
              index={index}
              onUpdate={updateDay}
              onDelete={deleteDay}
              onDuplicate={duplicateDay}
            />
          ))}
        </SortableContext>
      </DndContext>

      {program.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-muted-foreground/25 rounded-lg">
          <div className="text-muted-foreground mb-4">
            No days added yet. Start building your itinerary!
          </div>
          <Button onClick={addDay}>
            <Plus className="h-4 w-4 mr-2" />
            Add First Day
          </Button>
        </div>
      )}
    </div>
  );
}