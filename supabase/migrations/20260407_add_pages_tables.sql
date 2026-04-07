-- Tables pour le système de pages / page builder
CREATE TABLE IF NOT EXISTS restaurant_pages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  title         text NOT NULL,
  slug          text NOT NULL,
  position      smallint NOT NULL DEFAULT 0,
  is_published  boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, slug)
);

CREATE TABLE IF NOT EXISTS page_sections (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id    uuid REFERENCES restaurant_pages(id) ON DELETE CASCADE NOT NULL,
  type       text NOT NULL CHECK (type IN ('text_block', 'gallery')),
  position   smallint NOT NULL DEFAULT 0,
  content    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE restaurant_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_sections    ENABLE ROW LEVEL SECURITY;

-- Propriétaire : toutes opérations sur ses pages
CREATE POLICY "owner_all_pages" ON restaurant_pages FOR ALL USING (
  restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
);
-- Public : lecture des pages publiées
CREATE POLICY "public_read_pages" ON restaurant_pages FOR SELECT USING (is_published = true);

-- Propriétaire : toutes opérations sur ses sections
CREATE POLICY "owner_all_sections" ON page_sections FOR ALL USING (
  page_id IN (
    SELECT p.id FROM restaurant_pages p
    JOIN restaurants r ON r.id = p.restaurant_id
    WHERE r.owner_id = auth.uid()
  )
);
-- Public : lecture des sections de pages publiées
CREATE POLICY "public_read_sections" ON page_sections FOR SELECT USING (
  page_id IN (SELECT id FROM restaurant_pages WHERE is_published = true)
);
