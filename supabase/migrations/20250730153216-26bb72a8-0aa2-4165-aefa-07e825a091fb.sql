-- Create storage bucket for sensei profile images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('sensei-profiles', 'sensei-profiles', true);

-- Create storage policies for sensei profile images
CREATE POLICY "Sensei profile images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'sensei-profiles');

CREATE POLICY "Senseis can upload their own profile images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'sensei-profiles' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Senseis can update their own profile images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'sensei-profiles' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Senseis can delete their own profile images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'sensei-profiles' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);