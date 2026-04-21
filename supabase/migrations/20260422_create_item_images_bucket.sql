-- Migration : Bucket de stockage pour les images d'items
-- Date : 2026-04-22

-- Créer le bucket pour les images d'items
INSERT INTO storage.buckets (id, name, public)
VALUES ('item-images', 'item-images', true)
ON CONFLICT (id) DO NOTHING;

-- Politique : Permettre les uploads authentifiés
CREATE POLICY "Users can upload item images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'item-images');

-- Politique : Tout le monde peut lire les images publiques
CREATE POLICY "Public can read item images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'item-images');

-- Politique : Les propriétaires peuvent modifier/supprimer leurs images
CREATE POLICY "Users can update their item images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'item-images' AND owner = auth.uid())
WITH CHECK (bucket_id = 'item-images' AND owner = auth.uid());

CREATE POLICY "Users can delete their item images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'item-images' AND owner = auth.uid());
