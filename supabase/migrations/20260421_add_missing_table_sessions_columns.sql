-- Migration : Ajouter les colonnes manquantes à table_sessions
-- Date : 2026-04-21

ALTER TABLE table_sessions
  ADD COLUMN IF NOT EXISTS customer_count INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
