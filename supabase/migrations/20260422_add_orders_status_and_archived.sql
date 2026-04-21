-- Migration : Ajouter archived_at aux orders
-- Date : 2026-04-22
-- Note : La colonne 'status' existe déjà comme ENUM order_status
--        Pour les ardoises, on utilise 'ready' pour indiquer qu'une commande est servie

-- Ajouter la colonne archived_at pour les commandes archivées quand une session ferme
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL;

-- Index pour filtrer les commandes non archivées
CREATE INDEX IF NOT EXISTS idx_orders_not_archived ON orders(restaurant_id, archived_at) WHERE archived_at IS NULL;
