-- Migration : Ajouter status et archived_at aux orders
-- Date : 2026-04-22

-- Ajouter la colonne status (pending, delivered)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

-- Ajouter la colonne archived_at pour les commandes archivées quand une session ferme
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL;

-- Index pour filtrer les commandes non archivées
CREATE INDEX IF NOT EXISTS idx_orders_not_archived ON orders(restaurant_id, archived_at) WHERE archived_at IS NULL;

-- Index pour le status
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
