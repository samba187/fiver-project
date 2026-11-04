-- ============================================================
-- FIVEUR ACADEMY — mise à jour n°5
--   * notifications sur le téléphone des parents (paiement validé / refusé, réponse)
--   * paiement déposé par le staff à la place du parent
-- Ajouts uniquement. Rejouable.
-- ============================================================

ALTER TABLE academy_preuves_paiement ADD COLUMN IF NOT EXISTS depose_par TEXT;

CREATE TABLE IF NOT EXISTS parent_push (
  id SERIAL PRIMARY KEY,
  parent_id UUID NOT NULL REFERENCES parent_comptes(id) ON DELETE CASCADE,
  endpoint TEXT UNIQUE NOT NULL,
  abonnement JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE parent_push ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_all" ON parent_push;
CREATE POLICY "staff_all" ON parent_push FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Abonnement du téléphone du parent aux notifications (Web Push)
CREATE OR REPLACE FUNCTION parent_enregistrer_push(p_token TEXT, p_abonnement JSONB) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v parent_comptes := _parent_session(p_token);
BEGIN
  IF p_abonnement IS NULL OR coalesce(p_abonnement->>'endpoint', '') !~ '^https://' OR length(p_abonnement::text) > 4000 THEN
    RAISE EXCEPTION 'ABONNEMENT_INVALIDE';
  END IF;
  INSERT INTO parent_push (parent_id, endpoint, abonnement) VALUES (v.id, p_abonnement->>'endpoint', p_abonnement)
  ON CONFLICT (endpoint) DO UPDATE SET parent_id = EXCLUDED.parent_id, abonnement = EXCLUDED.abonnement;
  -- 10 téléphones / navigateurs maximum par compte
  DELETE FROM parent_push WHERE parent_id = v.id AND id NOT IN (SELECT id FROM parent_push WHERE parent_id = v.id ORDER BY created_at DESC LIMIT 10);
END $$;

CREATE OR REPLACE FUNCTION parent_supprimer_push(p_token TEXT, p_endpoint TEXT) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v parent_comptes := _parent_session(p_token);
BEGIN
  DELETE FROM parent_push WHERE parent_id = v.id AND endpoint = p_endpoint;
END $$;

GRANT EXECUTE ON FUNCTION parent_enregistrer_push(TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION parent_supprimer_push(TEXT, TEXT) TO anon, authenticated;
