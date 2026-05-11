-- ============================================================
-- FIVEUR ACADEMY — Transport / Chauffeur
-- Migration: 3 tables + storage + settings
-- ============================================================

-- 1. TABLE DES PARENTS TRANSPORT
CREATE TABLE IF NOT EXISTS transport_parents (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  telephone TEXT UNIQUE NOT NULL,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  -- Lien vers enfant(s) inscrit(s) à l'Academy
  registration_id INTEGER REFERENCES academy_registrations(id) ON DELETE SET NULL,
  enfant_nom_prenom TEXT,
  -- Localisation
  adresse TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  photo_maison_url TEXT,
  instructions_chauffeur TEXT,
  -- Statut
  statut TEXT DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'valide', 'bloque')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RÉSERVATIONS PAR SÉANCE
CREATE TABLE IF NOT EXISTS transport_bookings (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER REFERENCES transport_parents(id) ON DELETE CASCADE,
  date_seance DATE NOT NULL,
  type_trajet TEXT NOT NULL CHECK (type_trajet IN ('aller', 'retour', 'aller_retour')),
  montant INTEGER NOT NULL DEFAULT 60,
  statut TEXT DEFAULT 'confirme' CHECK (statut IN ('confirme', 'annule')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_id, date_seance)
);

-- 3. HISTORIQUE PAIEMENTS TRANSPORT
CREATE TABLE IF NOT EXISTS transport_payments_history (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER REFERENCES transport_parents(id) ON DELETE CASCADE,
  booking_id INTEGER REFERENCES transport_bookings(id) ON DELETE SET NULL,
  montant INTEGER NOT NULL,
  moyen_paiement TEXT DEFAULT 'Cash',
  date_paiement TIMESTAMPTZ DEFAULT NOW(),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RLS — TRANSPORT_PARENTS
-- ============================================================
ALTER TABLE transport_parents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tp_select_own" ON transport_parents;
DROP POLICY IF EXISTS "tp_insert_own" ON transport_parents;
DROP POLICY IF EXISTS "tp_update_own" ON transport_parents;
DROP POLICY IF EXISTS "tp_staff_all" ON transport_parents;

-- Parents can see their own row
CREATE POLICY "tp_select_own" ON transport_parents
  FOR SELECT USING (user_id = auth.uid() OR auth.role() = 'authenticated');

-- Parents can insert their own row
CREATE POLICY "tp_insert_own" ON transport_parents
  FOR INSERT WITH CHECK (true);

-- Parents can update their own row
CREATE POLICY "tp_update_own" ON transport_parents
  FOR UPDATE USING (user_id = auth.uid() OR auth.role() = 'authenticated');

-- Staff (authenticated) can do everything
CREATE POLICY "tp_staff_all" ON transport_parents
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- RLS — TRANSPORT_BOOKINGS
-- ============================================================
ALTER TABLE transport_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tb_select" ON transport_bookings;
DROP POLICY IF EXISTS "tb_insert" ON transport_bookings;
DROP POLICY IF EXISTS "tb_delete" ON transport_bookings;
DROP POLICY IF EXISTS "tb_staff_all" ON transport_bookings;

CREATE POLICY "tb_select" ON transport_bookings
  FOR SELECT USING (true);

CREATE POLICY "tb_insert" ON transport_bookings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "tb_delete" ON transport_bookings
  FOR DELETE USING (true);

CREATE POLICY "tb_staff_all" ON transport_bookings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- RLS — TRANSPORT_PAYMENTS_HISTORY
-- ============================================================
ALTER TABLE transport_payments_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tph_select" ON transport_payments_history;
DROP POLICY IF EXISTS "tph_staff_all" ON transport_payments_history;

CREATE POLICY "tph_select" ON transport_payments_history
  FOR SELECT USING (true);

CREATE POLICY "tph_staff_all" ON transport_payments_history
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- STORAGE BUCKET — Photos maison
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('transport_photos', 'transport_photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Transport Photos Public Read" ON storage.objects;
DROP POLICY IF EXISTS "Transport Photos Insert" ON storage.objects;
DROP POLICY IF EXISTS "Transport Photos Delete" ON storage.objects;

CREATE POLICY "Transport Photos Public Read" ON storage.objects
  FOR SELECT USING (bucket_id = 'transport_photos');
CREATE POLICY "Transport Photos Insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'transport_photos');
CREATE POLICY "Transport Photos Delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'transport_photos');

-- ============================================================
-- DEFAULT SETTINGS
-- ============================================================
INSERT INTO settings (key, value)
VALUES ('transport_jours', '["mercredi","vendredi"]')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value)
VALUES ('transport_tarifs', '{"aller":60,"retour":60,"aller_retour":120}')
ON CONFLICT (key) DO NOTHING;
