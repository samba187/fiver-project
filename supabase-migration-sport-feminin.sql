  -- ============================================================
  -- FIVEUR ARENA — Migration Sport Féminin
  -- Table: sport_feminin_inscriptions
  -- ============================================================

  CREATE TABLE IF NOT EXISTS sport_feminin_inscriptions (
    id SERIAL PRIMARY KEY,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    date_naissance DATE,
    telephone TEXT NOT NULL,
    enfant_inscrit BOOLEAN DEFAULT false,
    enfant_nom_prenom TEXT,
    statut TEXT DEFAULT 'en_attente' CHECK (statut IN ('confirmé', 'en_attente', 'annulé')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Ajout de la colonne au cas où la table existait déjà sans cette colonne
  ALTER TABLE sport_feminin_inscriptions 
    ADD COLUMN IF NOT EXISTS enfant_nom_prenom TEXT;

  -- Sécurité (RLS)
  ALTER TABLE sport_feminin_inscriptions ENABLE ROW LEVEL SECURITY;

  -- Suppression des anciennes policies pour éviter l'erreur "already exists" lors de réexécutions
  DROP POLICY IF EXISTS "Allow all for authenticated" ON sport_feminin_inscriptions;
  DROP POLICY IF EXISTS "Allow insert for anon" ON sport_feminin_inscriptions;

  -- Création des roles
  CREATE POLICY "Allow all for authenticated" ON sport_feminin_inscriptions
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

  CREATE POLICY "Allow insert for anon" ON sport_feminin_inscriptions
    FOR INSERT WITH CHECK (true);

  -- ============================================================
  -- Table: sport_feminin_payments_history
  -- ============================================================

  CREATE TABLE IF NOT EXISTS sport_feminin_payments_history (
    id SERIAL PRIMARY KEY,
    inscription_id INTEGER REFERENCES sport_feminin_inscriptions(id) ON DELETE CASCADE,
    mois_concerne TEXT NOT NULL, -- ex: "2026-04"
    montant NUMERIC NOT NULL,
    moyen_paiement TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  ALTER TABLE sport_feminin_payments_history ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Allow all for authenticated" ON sport_feminin_payments_history;
  
  CREATE POLICY "Allow all for authenticated" ON sport_feminin_payments_history
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
