import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  Image, 
  Video, 
  Camera, 
  Trash2, 
  Star,
  StarOff,
  Eye,
  Download,
  Tag,
  Loader2,
  X
} from 'lucide-react';

interface MediaItem {
  id: string;
  file_url: string;
  file_name: string;
  media_type: 'image' | 'video' | '360_photo';
  alt_text?: string;
  ai_tags?: string[];
  display_order: number;
  is_primary: boolean;
  file_size?: number;
  mime_type?: string;
}

interface EnhancedMediaGalleryProps {
  tripId?: string;
  mediaItems: MediaItem[];
  onMediaUpdate: (mediaItems: MediaItem[]) => void;
  maxFiles?: number;
  acceptedTypes?: string[];
  className?: string;
  onPrimaryChange?: (fileUrl: string, media: MediaItem) => void;
}

export function EnhancedMediaGallery({
  tripId,
  mediaItems,
  onMediaUpdate,
  maxFiles = 10,
  acceptedTypes = ['image/*', 'video/*'],
  className,
  onPrimaryChange
}: EnhancedMediaGalleryProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (mediaItems.length + acceptedFiles.length > maxFiles) {
      toast({
        title: "Too many files",
        description: `Maximum ${maxFiles} files allowed`,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    
    try {
      const uploadPromises = acceptedFiles.map(async (file, index) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${index}.${fileExt}`;
        const bucket = file.type.startsWith('video/') ? 'trip-videos' : 'trip-images';
        
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(fileName);

        // Determine media type
        let mediaType: 'image' | 'video' | '360_photo' = 'image';
        if (file.type.startsWith('video/')) {
          mediaType = 'video';
        } else if (file.name.toLowerCase().includes('360') || file.name.toLowerCase().includes('pano')) {
          mediaType = '360_photo';
        }

        // AI-powered tag generation (mock for now)
        const aiTags = await generateAITags(file);

        const mediaItem: MediaItem = {
          id: `temp_${Date.now()}_${index}`,
          file_url: publicUrl,
          file_name: file.name,
          media_type: mediaType,
          alt_text: `${file.name.split('.')[0]}`,
          ai_tags: aiTags,
          display_order: mediaItems.length + index,
          is_primary: mediaItems.length === 0 && index === 0,
          file_size: file.size,
          mime_type: file.type
        };

        // Save to database if tripId exists
        if (tripId) {
          const { data: dbData, error: dbError } = await supabase
            .from('trip_media')
            .insert([{
              trip_id: tripId,
              ...mediaItem,
              id: undefined // Let DB generate ID
            }])
            .select()
            .single();

          if (dbError) throw dbError;
          return { ...mediaItem, id: dbData.id };
        }

        return mediaItem;
      });

      const newMediaItems = await Promise.all(uploadPromises);
      onMediaUpdate([...mediaItems, ...newMediaItems]);

      toast({
        title: "Upload successful",
        description: `${acceptedFiles.length} file(s) uploaded`,
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload files",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [mediaItems, maxFiles, tripId, onMediaUpdate, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxSize: 50 * 1024 * 1024, // 50MB
    disabled: uploading
  });

  const generateAITags = async (file: File): Promise<string[]> => {
    // Mock AI tagging - in production, this would call an AI service
    const tags = [];
    
    if (file.type.startsWith('image/')) {
      tags.push('photo', 'adventure', 'travel');
      if (file.name.toLowerCase().includes('mountain')) tags.push('mountain');
      if (file.name.toLowerCase().includes('beach')) tags.push('beach');
      if (file.name.toLowerCase().includes('city')) tags.push('urban');
    } else if (file.type.startsWith('video/')) {
      tags.push('video', 'motion', 'experience');
    }
    
    return tags;
  };

  const deleteMedia = async (mediaId: string) => {
    try {
      if (tripId) {
        const { error } = await supabase
          .from('trip_media')
          .delete()
          .eq('id', mediaId);
        
        if (error) throw error;
      }

      const updatedMedia = mediaItems.filter(item => item.id !== mediaId);
      onMediaUpdate(updatedMedia);

      toast({
        title: "Media deleted",
        description: "Media item has been removed",
      });
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete media",
        variant: "destructive",
      });
    }
  };

  const setPrimaryMedia = async (mediaId: string) => {
    try {
      const updatedMedia = mediaItems.map(item => ({
        ...item,
        is_primary: item.id === mediaId
      }));

      const selectedItem = updatedMedia.find(item => item.id === mediaId);

      if (tripId) {
        // Update all media items to set is_primary false
        await supabase
          .from('trip_media')
          .update({ is_primary: false })
          .eq('trip_id', tripId);

        // Set the selected item as primary
        await supabase
          .from('trip_media')
          .update({ is_primary: true })
          .eq('id', mediaId);

        // Sync cover image on trip for primary media
        if (selectedItem) {
          await supabase
            .from('trips')
            .update({ image_url: selectedItem.file_url })
            .eq('id', tripId);
        }
      }

      onMediaUpdate(updatedMedia);
      if (selectedItem) {
        onPrimaryChange?.(selectedItem.file_url, selectedItem);
      }

      toast({
        title: "Primary media set",
        description: "This media is now the primary image",
      });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message || "Failed to set primary media",
        variant: "destructive",
      });
    }
  };

  const updateAltText = async (mediaId: string, altText: string) => {
    try {
      const updatedMedia = mediaItems.map(item =>
        item.id === mediaId ? { ...item, alt_text: altText } : item
      );

      if (tripId) {
        await supabase
          .from('trip_media')
          .update({ alt_text: altText })
          .eq('id', mediaId);
      }

      onMediaUpdate(updatedMedia);
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update alt text",
        variant: "destructive",
      });
    }
  };

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-4 w-4" />;
      case '360_photo': return <Camera className="h-4 w-4" />;
      default: return <Image className="h-4 w-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={className}>
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
          ${uploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary hover:bg-primary/5'}
        `}
      >
        <input {...getInputProps()} />
        <div className="space-y-2">
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              <p>Uploading...</p>
              <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm">
                {isDragActive
                  ? "Drop the files here..."
                  : "Drag & drop files here, or click to select"}
              </p>
              <p className="text-xs text-muted-foreground">
                Images and videos up to 50MB ({mediaItems.length}/{maxFiles} files)
              </p>
            </>
          )}
        </div>
      </div>

      {/* Media Grid */}
      {mediaItems.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
          {mediaItems.map((media) => (
            <Card key={media.id} className="overflow-hidden group">
              <CardContent className="p-0">
                <div className="relative aspect-square">
                  {media.media_type === 'video' ? (
                    <video
                      src={media.file_url}
                      className="w-full h-full object-cover"
                      controls={false}
                      muted
                      preload="metadata"
                    />
                  ) : (
                    <img
                      src={media.file_url}
                      alt={media.alt_text || media.file_name}
                      className="w-full h-full object-cover"
                    />
                  )}

                  {/* Media Type Badge */}
                  <Badge
                    variant="secondary"
                    className="absolute top-2 left-2 flex items-center gap-1"
                  >
                    {getMediaIcon(media.media_type)}
                    {media.media_type}
                  </Badge>

                  {/* Primary Badge */}
                  {media.is_primary && (
                    <Badge
                      variant="default"
                      className="absolute top-2 right-2 bg-yellow-500"
                    >
                      Primary
                    </Badge>
                  )}

                  {/* Overlay Actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setSelectedMedia(media.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={media.is_primary ? "default" : "secondary"}
                      onClick={() => setPrimaryMedia(media.id)}
                    >
                      {media.is_primary ? <Star className="h-4 w-4" /> : <StarOff className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteMedia(media.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* File Info */}
                <div className="p-3 space-y-2">
                  <Input
                    value={media.alt_text || ''}
                    onChange={(e) => updateAltText(media.id, e.target.value)}
                    placeholder="Alt text"
                    className="text-xs"
                  />
                  
                  <div className="flex flex-wrap gap-1">
                    {media.ai_tags?.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {media.file_size && formatFileSize(media.file_size)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}