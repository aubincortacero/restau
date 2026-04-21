-- Migration : Ajouter les foreign keys manquantes à table_sessions
-- Date : 2026-04-21

-- Ajouter la foreign key vers restaurants si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'table_sessions_restaurant_id_fkey'
  ) THEN
    ALTER TABLE table_sessions
      ADD CONSTRAINT table_sessions_restaurant_id_fkey
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ajouter la foreign key vers tables si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'table_sessions_table_id_fkey'
  ) THEN
    ALTER TABLE table_sessions
      ADD CONSTRAINT table_sessions_table_id_fkey
      FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE CASCADE;
  END IF;
END $$;
