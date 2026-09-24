-- ============================================================
-- FIVEUR ARENA — Saisons, Badges QR & Présences
-- 1. Système de saisons (Academy, Sport Féminin, Transport)
-- 2. Code badge QR permanent par enfant
-- 3. Traçabilité des présences par scan à l'accueil
-- ============================================================

-- ============================================================
-- 1. TABLE DES SAISONS
-- ============================================================
CREATE TABLE IF NOT EXISTS saisons (
  id SERIAL PRIMARY KEY,
  nom TEXT UNIQUE NOT NULL,
  date_debut DATE,
  date_fin DATE,
  statut TEXT DEFAULT 'active' CHECK (statut IN ('active', 'archivee')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

ALTER TABLE saisons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "saisons_staff_all" ON saisons;
CREATE POLICY "saisons_staff_all" ON saisons
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- La saison en cours au moment de la migration
INSERT INTO saisons (nom, date_debut, date_fin, statut)
VALUES ('2025-2026', '2025-10-01', '2026-09-30', 'active')
ON CONFLICT (nom) DO NOTHING;

INSERT INTO settings (key, value)
VALUES ('saison_courante', '2025-2026')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 2. COLONNE SAISON SUR LES MODULES À INSCRIPTION
-- Toutes les données existantes appartiennent à 2025-2026.
-- ============================================================
ALTER TABLE academy_registrations
  ADD COLUMN IF NOT EXISTS saison TEXT DEFAULT '2025-2026';
UPDATE academy_registrations SET saison = '2025-2026' WHERE saison IS NULL;
CREATE INDEX IF NOT EXISTS idx_academy_reg_saison ON academy_registrations (saison);

ALTER TABLE sport_feminin_inscriptions
  ADD COLUMN IF NOT EXISTS saison TEXT DEFAULT '2025-2026';
UPDATE sport_feminin_inscriptions SET saison = '2025-2026' WHERE saison IS NULL;
CREATE INDEX IF NOT EXISTS idx_sport_feminin_saison ON sport_feminin_inscriptions (saison);

ALTER TABLE transport_parents
  ADD COLUMN IF NOT EXISTS saison TEXT DEFAULT '2025-2026';
UPDATE transport_parents SET saison = '2025-2026' WHERE saison IS NULL;
CREATE INDEX IF NOT EXISTS idx_transport_parents_saison ON transport_parents (saison);

-- ============================================================
-- 3. CODE BADGE QR
-- Le code identifie l'ENFANT, pas l'inscription : il est conservé
-- d'une saison à l'autre pour que la carte plastifiée reste valide.
-- ============================================================
ALTER TABLE academy_registrations
  ADD COLUMN IF NOT EXISTS badge_code TEXT;

-- Alphabet sans caractères ambigus (0/O, 1/I) pour la saisie manuelle de secours
CREATE OR REPLACE FUNCTION generate_badge_code() RETURNS TEXT AS $$
DECLARE
  alphabet TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(alphabet, floor(random() * length(alphabet) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Attribution d'un code aux inscrits existants
DO $$
DECLARE
  rec RECORD;
  new_code TEXT;
BEGIN
  FOR rec IN SELECT id FROM academy_registrations WHERE badge_code IS NULL LOOP
    LOOP
      new_code := generate_badge_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM academy_registrations WHERE badge_code = new_code);
    END LOOP;
    UPDATE academy_registrations SET badge_code = new_code WHERE id = rec.id;
  END LOOP;
END $$;

-- Un même enfant garde son code d'une saison à l'autre,
-- mais ne peut pas avoir deux inscriptions dans la même saison.
CREATE UNIQUE INDEX IF NOT EXISTS idx_academy_badge_saison
  ON academy_registrations (badge_code, saison);
CREATE INDEX IF NOT EXISTS idx_academy_badge_code
  ON academy_registrations (badge_code);

-- ============================================================
-- 4. PRÉSENCES (scan à l'accueil)
-- badge_code est dénormalisé pour conserver l'historique même
-- si une inscription de saison passée est supprimée.
-- ============================================================
CREATE TABLE IF NOT EXISTS academy_presences (
  id SERIAL PRIMARY KEY,
  registration_id INTEGER REFERENCES academy_registrations(id) ON DELETE SET NULL,
  badge_code TEXT NOT NULL,
  saison TEXT,
  date_presence DATE NOT NULL DEFAULT CURRENT_DATE,
  scanned_at TIMESTAMPTZ DEFAULT NOW(),
  statut_abonnement TEXT CHECK (statut_abonnement IN ('paye', 'partiel', 'non_paye', 'off')),
  autorise BOOLEAN DEFAULT true,
  scanned_by TEXT,
  note TEXT
);

CREATE INDEX IF NOT EXISTS idx_presences_badge ON academy_presences (badge_code, date_presence DESC);
CREATE INDEX IF NOT EXISTS idx_presences_date ON academy_presences (date_presence DESC);
CREATE INDEX IF NOT EXISTS idx_presences_registration ON academy_presences (registration_id);

ALTER TABLE academy_presences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "presences_staff_all" ON academy_presences;
CREATE POLICY "presences_staff_all" ON academy_presences
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
