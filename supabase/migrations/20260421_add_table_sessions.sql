-- Migration : Système de sessions de table et paiement partiel
-- Date : 2026-04-21

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. Table des sessions de table
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS table_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ NULL,
  
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  
  customer_count INTEGER DEFAULT 1,
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT check_amounts CHECK (paid_amount <= total_amount),
  CONSTRAINT check_positive_amounts CHECK (total_amount >= 0 AND paid_amount >= 0)
);

CREATE INDEX idx_table_sessions_restaurant ON table_sessions(restaurant_id);
CREATE INDEX idx_table_sessions_table ON table_sessions(table_id);
CREATE INDEX idx_table_sessions_active ON table_sessions(restaurant_id, closed_at) WHERE closed_at IS NULL;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_table_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER table_sessions_updated_at
  BEFORE UPDATE ON table_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_table_sessions_updated_at();

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 2. Lier orders aux sessions
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES table_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_session ON orders(session_id);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 3. Paiements partiels sur order_items
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS paid_quantity INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10, 2) NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_paid_quantity' 
    AND conrelid = 'order_items'::regclass
  ) THEN
    ALTER TABLE order_items
      ADD CONSTRAINT check_paid_quantity 
        CHECK (paid_quantity >= 0 AND paid_quantity <= quantity);
  END IF;
END $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 4. Historique des paiements partiels
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS partial_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES table_sessions(id) ON DELETE CASCADE,
  
  amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('online', 'cash')),
  payment_intent_id TEXT,
  
  customer_name TEXT,
  customer_email TEXT,
  
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT check_positive_amount CHECK (amount > 0)
);

CREATE INDEX idx_partial_payments_session ON partial_payments(session_id);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 5. Fonction calcul de balance
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE FUNCTION get_session_balance(session_uuid UUID)
RETURNS TABLE (
  total_amount DECIMAL(10, 2),
  paid_amount DECIMAL(10, 2),
  remaining_amount DECIMAL(10, 2),
  is_fully_paid BOOLEAN
) AS $$
DECLARE
  v_total DECIMAL(10, 2);
  v_paid DECIMAL(10, 2);
BEGIN
  SELECT COALESCE(SUM(oi.quantity * oi.unit_price), 0)
  INTO v_total
  FROM orders o
  INNER JOIN order_items oi ON oi.order_id = o.id
  WHERE o.session_id = session_uuid;
  
  SELECT COALESCE(SUM(pp.amount), 0)
  INTO v_paid
  FROM partial_payments pp
  WHERE pp.session_id = session_uuid;
  
  RETURN QUERY SELECT 
    v_total,
    v_paid,
    v_total - v_paid,
    v_total <= v_paid;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour incrémenter les quantités payées d'un order_item
CREATE OR REPLACE FUNCTION increment_paid_quantity(
  order_item_uuid UUID,
  qty_to_add INTEGER,
  amount_to_add DECIMAL(10, 2)
)
RETURNS VOID AS $$
BEGIN
  UPDATE order_items
  SET 
    paid_quantity = paid_quantity + qty_to_add,
    paid_amount = paid_amount + amount_to_add
  WHERE id = order_item_uuid;
END;
$$ LANGUAGE plpgsql;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 6. RLS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE table_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE partial_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY table_sessions_owner_policy ON table_sessions
  FOR ALL
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY partial_payments_owner_policy ON partial_payments
  FOR ALL
  USING (
    session_id IN (
      SELECT ts.id FROM table_sessions ts
      INNER JOIN restaurants r ON r.id = ts.restaurant_id
      WHERE r.owner_id = auth.uid()
    )
  );

-- Politique publique pour les clients (lecture seule de leur session)
CREATE POLICY table_sessions_public_read ON table_sessions
  FOR SELECT
  USING (true);

CREATE POLICY partial_payments_public_read ON partial_payments
  FOR SELECT
  USING (true);
