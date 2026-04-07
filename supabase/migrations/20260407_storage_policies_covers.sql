-- Policies de storage pour le bucket restaurant-covers
-- À exécuter dans Supabase SQL Editor

-- Upload : propriétaire uniquement (chemin commence par leur restaurant id)
CREATE POLICY "owner_upload_covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'restaurant-covers'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM restaurants WHERE owner_id = auth.uid()
  )
);

-- Update (upsert) : propriétaire uniquement
CREATE POLICY "owner_update_covers"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'restaurant-covers'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM restaurants WHERE owner_id = auth.uid()
  )
);

-- Delete : propriétaire uniquement
CREATE POLICY "owner_delete_covers"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'restaurant-covers'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM restaurants WHERE owner_id = auth.uid()
  )
);

-- Lecture : public (bucket public)
CREATE POLICY "public_read_covers"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'restaurant-covers');
