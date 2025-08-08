import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";

interface CoverImageUploaderProps {
  tripId?: string;
  value?: string;
  onChange?: (url: string) => void;
  className?: string;
}

export const CoverImageUploader: React.FC<CoverImageUploaderProps> = ({
  tripId,
  value,
  onChange,
  className,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handlePick = () => fileInputRef.current?.click();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      if (!user) {
        toast({ title: "Sign in required", description: "Please sign in to upload.", variant: "destructive" });
        return;
      }

      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/${tripId || "general"}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("trip-covers")
        .upload(filePath, file, { upsert: true, cacheControl: "3600" });
      if (uploadError) throw uploadError;

      const { data: pub } = supabase.storage.from("trip-covers").getPublicUrl(filePath);
      const publicUrl = pub.publicUrl;

      if (tripId) {
        const { error: updateErr } = await supabase
          .from("trips")
          .update({ image_url: publicUrl })
          .eq("id", tripId);
        if (updateErr) throw updateErr;
      }

      onChange?.(publicUrl);
      toast({ title: "Cover updated", description: "Your cover image has been uploaded." });
    } catch (err: any) {
      console.error("Cover upload error", err);
      toast({ title: "Upload failed", description: err?.message || "Please try again.", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleClear = async () => {
    try {
      if (tripId) {
        const { error } = await supabase.from("trips").update({ image_url: null }).eq("id", tripId);
        if (error) throw error;
      }
      onChange?.("");
      toast({ title: "Cover cleared", description: "Cover image removed for this trip." });
    } catch (err: any) {
      toast({ title: "Action failed", description: err?.message || "Please try again.", variant: "destructive" });
    }
  };

  return (
    <Card className={className}>
      <CardContent className="p-4 space-y-3">
        <div className="aspect-[16/9] w-full overflow-hidden rounded-md bg-muted flex items-center justify-center">
          {value ? (
            <img src={value} alt="Trip cover image" className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="text-muted-foreground flex flex-col items-center gap-2">
              <ImagePlus className="h-6 w-6" />
              <span className="text-sm">No cover selected</span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          <Button type="button" onClick={handlePick} disabled={uploading}>
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...
              </>
            ) : (
              <>Upload cover</>
            )}
          </Button>
          {value && (
            <Button type="button" variant="outline" onClick={handleClear} disabled={uploading}>
              <Trash2 className="mr-2 h-4 w-4" /> Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">This single image is used for the trip card and hero banner.</p>
      </CardContent>
    </Card>
  );
};
