-- Ajout d'une image de couverture par page (hero individuel)
ALTER TABLE restaurant_pages ADD COLUMN IF NOT EXISTS cover_image_url text;
