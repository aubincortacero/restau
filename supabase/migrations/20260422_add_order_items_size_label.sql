-- Add size_label column to order_items to store variant/size information
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS size_label TEXT NULL;

COMMENT ON COLUMN order_items.size_label IS 'Label de la variante/taille choisie (ex: "25cl", "50cl")';
