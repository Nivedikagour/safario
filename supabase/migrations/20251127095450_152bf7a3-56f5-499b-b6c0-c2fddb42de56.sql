-- Create storage bucket for profile images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profiles',
  'profiles',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- Storage policies for profile images
CREATE POLICY "Anyone can view profile images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profiles');

CREATE POLICY "Users can upload their own profile image"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profiles' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own profile image"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'profiles' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own profile image"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'profiles' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create storage bucket for lost item images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lost-items',
  'lost-items',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- Storage policies for lost item images
CREATE POLICY "Anyone can view lost item images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'lost-items');

CREATE POLICY "Authenticated users can upload lost item images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'lost-items' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update their own lost item images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'lost-items' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own lost item images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'lost-items' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );