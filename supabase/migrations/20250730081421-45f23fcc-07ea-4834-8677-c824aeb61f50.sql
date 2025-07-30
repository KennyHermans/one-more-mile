-- Create storage bucket for CV uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('cv-uploads', 'cv-uploads', true);

-- Create policies for CV uploads
CREATE POLICY "Anyone can view CVs" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'cv-uploads');

CREATE POLICY "Authenticated users can upload CVs" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'cv-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own CVs" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'cv-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own CVs" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'cv-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add cv_file_url column to applications table
ALTER TABLE public.applications 
ADD COLUMN cv_file_url TEXT;