-- Ajoute la colonne cover_image_url à la table restaurants
-- Photo de couverture affichée en hero sur la page menu client
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS cover_image_url text;
