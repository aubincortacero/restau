-- Logo et largeur max du menu
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS menu_max_width integer;
