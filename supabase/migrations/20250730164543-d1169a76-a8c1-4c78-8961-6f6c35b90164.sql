-- Create storage bucket for trip images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('trip-images', 'trip-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for trip images
CREATE POLICY "Admin can upload trip images" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'trip-images' AND 
  auth.email() = 'kenny_hermans93@hotmail.com'
);

CREATE POLICY "Admin can update trip images" 
ON storage.objects 
FOR UPDATE 
TO authenticated
USING (
  bucket_id = 'trip-images' AND 
  auth.email() = 'kenny_hermans93@hotmail.com'
);

CREATE POLICY "Admin can delete trip images" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (
  bucket_id = 'trip-images' AND 
  auth.email() = 'kenny_hermans93@hotmail.com'
);

CREATE POLICY "Trip images are publicly viewable" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'trip-images');