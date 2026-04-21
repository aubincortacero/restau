-- Migration : Fix colonne id avec UUID par défaut
-- Date : 2026-04-21

ALTER TABLE table_sessions
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
