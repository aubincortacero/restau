-- Ajoute les colonnes de contenu "site web" / page À propos au restaurant
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS about_description text,
  ADD COLUMN IF NOT EXISTS about_image_url   text,
  ADD COLUMN IF NOT EXISTS team_members      jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS contact_phone     text,
  ADD COLUMN IF NOT EXISTS contact_email     text,
  ADD COLUMN IF NOT EXISTS contact_address   text;
