-- Ajouter le champ ardoise_enabled à la table restaurants
-- Par défaut, l'ardoise est activée pour tous les restaurants existants
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS ardoise_enabled BOOLEAN DEFAULT true NOT NULL;

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_restaurants_ardoise_enabled ON restaurants(ardoise_enabled);
