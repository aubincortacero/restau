-- Migration : Fix RLS pour permettre la création de sessions via service role
-- Date : 2026-04-21

-- Ajouter une policy INSERT publique pour table_sessions
-- Permet au service role de créer des sessions pour les clients non authentifiés
CREATE POLICY table_sessions_public_insert ON table_sessions
  FOR INSERT
  WITH CHECK (true);

-- Ajouter une policy UPDATE publique pour table_sessions
-- Permet de mettre à jour les montants de la session
CREATE POLICY table_sessions_public_update ON table_sessions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Ajouter une policy INSERT publique pour partial_payments
CREATE POLICY partial_payments_public_insert ON partial_payments
  FOR INSERT
  WITH CHECK (true);
