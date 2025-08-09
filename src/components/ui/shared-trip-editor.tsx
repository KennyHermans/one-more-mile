import React, { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DragDropItineraryBuilder } from "@/components/ui/drag-drop-itinerary-builder";
import { EnhancedMediaGallery } from "@/components/ui/enhanced-media-gallery";
import { TripTemplateManager } from "@/components/ui/trip-template-manager";
import { WorkflowStatusManager } from "@/components/ui/workflow-status-manager";
import { PermissionAwareField } from "@/components/ui/permission-aware-field";
import { SenseiLevelBadge } from "@/components/ui/sensei-level-badge";
import { useSenseiPermissions } from "@/hooks/use-sensei-permissions";
import { useTripPermissions } from "@/hooks/use-trip-permissions";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Trip, ProgramDay } from "@/types/trip";
import { format, differenceInDays } from "date-fns";
import { Loader2, Lock } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CoverImageUploader } from "@/components/ui/cover-image-uploader";
import { useAdminPermissions } from "@/hooks/use-admin-permissions";

export type SharedTripEditorRole = "admin" | "sensei";

interface SenseiProfileLite {
  id: string;
  name: string;
  specialty?: string;
  sensei_level?: "apprentice" | "journey_guide" | "master_sensei";
}

interface SharedTripEditorProps {
  role: SharedTripEditorRole;
  editingTrip?: Trip | null;
  onClose: () => void;
  onSaved: () => void;
  senseiId?: string; // for sensei role
}

// NOTE: This component focuses on unifying layout/UX between Admin and Sensei editors.
// It intentionally keeps business logic minimal and leverages existing hooks/components.
export const SharedTripEditor: React.FC<SharedTripEditorProps> = ({
  role,
  editingTrip,
  onClose,
  onSaved,
  senseiId,
}) => {
const { permissions: adminPerms } = useAdminPermissions();
  const isAdmin = role === "admin" || adminPerms?.canManageTrips;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const { permissions: senseiPermissions, currentLevel } = useSenseiPermissions(
    // use passed senseiId (for sensei) or the trip sensei_id if present
    (senseiId || editingTrip?.sensei_id) || undefined
  );
  const { canEditField } = useTripPermissions(
    (senseiId || editingTrip?.sensei_id) || undefined,
    editingTrip?.id
  );

  const [senseis, setSenseis] = useState<SenseiProfileLite[]>([]);
  useEffect(() => {
    if (!isAdmin) return;
    const fetchSenseis = async () => {
      const { data, error } = await supabase
        .from("sensei_profiles")
        .select("id, name, sensei_level, specialty")
        .eq("is_active", true);
      if (!error) setSenseis((data || []).map((d: any) => ({ id: d.id, name: d.name, specialty: d.specialty, sensei_level: d.sensei_level as "apprentice" | "journey_guide" | "master_sensei" })));
    };
    fetchSenseis();
  }, [isAdmin]);

  const [formData, setFormData] = useState({
    title: editingTrip?.title || "",
    destination: editingTrip?.destination || "",
    description: editingTrip?.description || "",
    price: editingTrip?.price || "",
    dates: editingTrip?.dates || "",
    start_date: (editingTrip as any)?.start_date ? new Date((editingTrip as any).start_date as any) : null,
    end_date: (editingTrip as any)?.end_date ? new Date((editingTrip as any).end_date as any) : null,
    group_size: editingTrip?.group_size || "",
    sensei_name: editingTrip?.sensei_name || "",
    sensei_id: (isAdmin ? editingTrip?.sensei_id : senseiId) || null as string | null,
    backup_sensei_id: editingTrip?.backup_sensei_id || null as string | null,
    requires_backup_sensei: editingTrip?.requires_backup_sensei || false,
    image_url: editingTrip?.image_url || "",
    theme: editingTrip?.theme || "",
    rating: editingTrip?.rating || 0,
    duration_days: editingTrip?.duration_days || 1,
    difficulty_level: (editingTrip?.difficulty_level as string) || "Moderate",
    max_participants: editingTrip?.max_participants || 12,
    current_participants: editingTrip?.current_participants || 0,
    is_active: editingTrip?.is_active ?? false,
    trip_status: (editingTrip as any)?.trip_status || "draft",
    program: (editingTrip?.program as ProgramDay[]) || [],
    included_amenities: editingTrip?.included_amenities || [],
    excluded_items: editingTrip?.excluded_items || [],
    requirements: editingTrip?.requirements || [],
    media_items: (editingTrip as any)?.media_items || [],
  });

  const headerTitle = useMemo(() => (editingTrip ? "Edit Trip" : "Create New Trip"), [editingTrip]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "number"
          ? parseFloat(value) || 0
          : type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : value,
    }));
  };

  const saveTrip = async (overrideStatus?: string) => {
    setIsSubmitting(true);
    try {
      let datesString = formData.dates;
      if (formData.start_date && formData.end_date) {
        datesString = `${format(formData.start_date, "MMMM d")} - ${format(formData.end_date, "MMMM d, yyyy")}`;
        const duration = differenceInDays(formData.end_date, formData.start_date) + 1;
        formData.duration_days = duration;
      }

      const { start_date, end_date, media_items, ...dbFormData } = formData as any;
      const tripData: any = {
        ...dbFormData,
        dates: datesString,
        start_date: formData.start_date ? formData.start_date.toISOString().split("T")[0] : null,
        end_date: formData.end_date ? formData.end_date.toISOString().split("T")[0] : null,
        program: JSON.stringify(formData.program || []),
      };

      if (!isAdmin && senseiId) {
        // Ensure the trip is owned by the current sensei when in sensei role
        tripData.sensei_id = senseiId;
      }
      if (overrideStatus) {
        tripData.trip_status = overrideStatus;
        if (overrideStatus === "review") tripData.is_active = false;
      }

      if (editingTrip) {
        const { error } = await supabase.from("trips").update(tripData).eq("id", editingTrip.id);
        if (error) throw error;
        toast({ title: "Success", description: "Trip updated successfully." });
      } else {
        const { error } = await supabase.from("trips").insert([tripData]);
        if (error) throw error;
        toast({ title: "Success", description: "Trip created successfully." });
      }

      onSaved();
    } catch (error) {
      console.error("Error saving trip:", error);
      toast({ title: "Error", description: "Failed to save trip.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="font-serif text-xl font-semibold flex items-center gap-3">
          {headerTitle}
          {currentLevel && (
            <SenseiLevelBadge
              level={currentLevel as "apprentice" | "journey_guide" | "master_sensei"}
              size="sm"
            />
          )}
        </h2>
        {senseiPermissions && !senseiPermissions.can_edit_trips && (
          <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded-md mt-2">
            <Lock className="h-4 w-4 inline mr-1" />
            Some fields may be restricted based on your Sensei level
          </div>
        )}
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="itinerary">Itinerary</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="workflow">Workflow</TabsTrigger>
        </TabsList>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            return saveTrip();
          }}
          className="space-y-6"
        >
          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PermissionAwareField
                fieldName="title"
                canEdit={canEditField("title")}
                currentLevel={currentLevel as any}
                requiredLevel="apprentice"
                isAdmin={isAdmin}
                label="Title *"
              >
                <Input
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Trip title"
                  required
                />
              </PermissionAwareField>

              <PermissionAwareField
                fieldName="destination"
                canEdit={canEditField("destination")}
                currentLevel={currentLevel as any}
                requiredLevel="apprentice"
                isAdmin={isAdmin}
                label="Destination *"
              >
                <Input
                  name="destination"
                  value={formData.destination}
                  onChange={handleInputChange}
                  placeholder="Destination"
                  required
                />
              </PermissionAwareField>
            </div>

            <PermissionAwareField
              fieldName="description"
              canEdit={canEditField("description")}
              currentLevel={currentLevel as any}
              requiredLevel="apprentice"
              isAdmin={isAdmin}
              label="Description *"
            >
              <Textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Trip description"
                rows={3}
                required
              />
            </PermissionAwareField>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <PermissionAwareField
                fieldName="price"
                canEdit={canEditField("price")}
                currentLevel={currentLevel as any}
                requiredLevel="journey_guide"
                isAdmin={isAdmin}
                label="Price *"
              >
                <Input
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder="$2,999"
                  required
                />
              </PermissionAwareField>

              <PermissionAwareField
                fieldName="theme"
                canEdit={canEditField("theme")}
                currentLevel={currentLevel as any}
                requiredLevel="apprentice"
                isAdmin={isAdmin}
                label="Theme"
              >
                <Input name="theme" value={formData.theme} onChange={handleInputChange} placeholder="Adventure theme" />
              </PermissionAwareField>

              <div>
                <label className="block text-sm font-medium mb-2">Difficulty</label>
                <select
                  name="difficulty_level"
                  value={formData.difficulty_level}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="Easy">Easy</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Challenging">Challenging</option>
                  <option value="Extreme">Extreme</option>
                </select>
              </div>
            </div>

            <PermissionAwareField
              fieldName="dates"
              canEdit={canEditField("dates")}
              currentLevel={currentLevel as any}
              requiredLevel="apprentice"
              isAdmin={isAdmin}
              label="Dates"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="block text-sm font-medium mb-2">Start Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn("justify-start", !formData.start_date && "text-muted-foreground")}
                        type="button"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.start_date ? (
                          format(formData.start_date, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.start_date as any}
                        onSelect={(d: any) => setFormData((prev) => ({ ...prev, start_date: d || null }))}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex flex-col">
                  <label className="block text-sm font-medium mb-2">End Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn("justify-start", !formData.end_date && "text-muted-foreground")}
                        type="button"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.end_date ? (
                          format(formData.end_date, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.end_date as any}
                        onSelect={(d: any) => setFormData((prev) => ({ ...prev, end_date: d || null }))}
                        disabled={(date: Date) => (formData.start_date ? date < formData.start_date : false)}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </PermissionAwareField>

            <PermissionAwareField
              fieldName="image_url"
              canEdit={true}
              currentLevel={currentLevel as any}
              requiredLevel="apprentice"
              isAdmin={isAdmin}
              label="Card Cover Image"
            >
              <CoverImageUploader
                tripId={editingTrip?.id}
                value={formData.image_url}
                onChange={(url) => setFormData((prev) => ({ ...prev, image_url: url }))}
              />
            </PermissionAwareField>

            {isAdmin ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Primary Sensei</label>
                  <select
                    name="sensei_id"
                    value={formData.sensei_id || ""}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">Select a sensei</option>
                    {senseis.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <PermissionAwareField
                  fieldName="group_size"
                  canEdit={canEditField("group_size")}
                  currentLevel={currentLevel as any}
                  requiredLevel="apprentice"
                  isAdmin={isAdmin}
                  label="Max Participants"
                >
                  <Input
                    name="max_participants"
                    type="number"
                    value={formData.max_participants}
                    onChange={handleInputChange}
                    min={1}
                    max={50}
                  />
                </PermissionAwareField>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Badge variant="outline">Primary Sensei: You</Badge>
                </div>
                <PermissionAwareField
                  fieldName="group_size"
                  canEdit={canEditField("group_size")}
                  currentLevel={currentLevel as any}
                  requiredLevel="apprentice"
                  isAdmin={isAdmin}
                  label="Max Participants"
                >
                  <Input
                    name="max_participants"
                    type="number"
                    value={formData.max_participants}
                    onChange={handleInputChange}
                    min={1}
                    max={50}
                  />
                </PermissionAwareField>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                name="is_active"
                checked={formData.is_active}
                onChange={handleInputChange}
                className="rounded"
                disabled={!isAdmin}
              />
              <label htmlFor="is_active" className="text-sm font-medium">
                Active (visible to users)
              </label>
            </div>
          </TabsContent>

          <TabsContent value="itinerary" className="space-y-4">
            <DragDropItineraryBuilder
              program={formData.program}
              onChange={(newProgram) => setFormData((prev) => ({ ...prev, program: newProgram }))}
            />
          </TabsContent>

          <TabsContent value="media" className="space-y-4">
            <p className="text-sm text-muted-foreground">Tip: Set a Primary media item. It will be used as the trip's cover image automatically.</p>
            <EnhancedMediaGallery
              tripId={editingTrip?.id}
              mediaItems={formData.media_items}
              onMediaUpdate={(newItems) => setFormData((prev) => ({ ...prev, media_items: newItems }))}
              onPrimaryChange={(url) => setFormData((prev) => ({ ...prev, image_url: url }))}
            />
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <TripTemplateManager
              currentTripData={formData as any}
              onApplyTemplate={(templateData) => {
                setFormData((prev) => ({
                  ...prev,
                  ...templateData,
                  title: templateData.title || prev.title,
                  program: templateData.program || prev.program,
                }));
              }}
            />
          </TabsContent>

          <TabsContent value="workflow" className="space-y-4">
            {editingTrip && isAdmin ? (
              <WorkflowStatusManager
                tripId={editingTrip.id}
                currentStatus={(editingTrip as any).trip_status || "draft"}
                onStatusChange={(newStatus) => {
                  setFormData((prev: any) => ({ ...prev, trip_status: newStatus, is_active: newStatus === 'published' ? true : prev.is_active }));
                }}
                canManageWorkflow={true}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {isAdmin ? "Save the trip first to manage workflow status" : "Workflow is managed by Admins"}
              </div>
            )}
          </TabsContent>

          <div className="flex gap-2 pt-4 border-t">
            {isAdmin ? (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingTrip ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  editingTrip ? "Update Trip" : "Create Trip"
                )}
              </Button>
            ) : (
              <>
                <Button type="button" onClick={() => saveTrip("draft")} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    "Save Draft"
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => saveTrip("review")} disabled={isSubmitting}>
                  Submit for Review
                </Button>
              </>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onClose();
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Tabs>
    </div>
  );
};
