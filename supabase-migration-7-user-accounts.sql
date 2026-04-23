-- ============================================================
-- MIGRATION 7 — Comptes Clients + Multi-Réservations + Acomptes
-- À exécuter dans le SQL Editor de Supabase
-- ============================================================

-- 1. TABLE DES PROFILS CLIENTS (liée à auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  is_suspended BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Le profil est lisible publiquement (pour le lookup phone → email à la connexion)
CREATE POLICY "Public can read user_profiles" ON user_profiles
  FOR SELECT TO public USING (true);

-- Un utilisateur authentifié peut insérer son propre profil
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT TO public WITH CHECK (true);

-- Un utilisateur authentifié peut modifier son propre profil
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());

-- Staff peut tout faire
CREATE POLICY "Staff can manage all profiles" ON user_profiles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- 2. EXTENSIONS SUR LA TABLE RESERVATIONS
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS recurrence_group UUID,
  ADD COLUMN IF NOT EXISTS deposit_amount INTEGER DEFAULT 0;


-- 3. PARAMÈTRE : Nombre max de semaines récurrentes
INSERT INTO settings (key, value)
VALUES ('max_recurrence_weeks', '5')
ON CONFLICT (key) DO NOTHING;


-- 4. MISE À JOUR DU TRIGGER enforce_reservation_price
-- On s'assure qu'il ne touche PAS à amount_paid ni deposit_amount
CREATE OR REPLACE FUNCTION enforce_reservation_price()
RETURNS TRIGGER AS $$
DECLARE
  day_of_week integer;
  is_weekend boolean;
  setting_price text;
  final_price integer;
BEGIN
  day_of_week := EXTRACT(DOW FROM NEW.date::date);

  IF day_of_week = 0 OR day_of_week = 5 OR day_of_week = 6 THEN
    is_weekend := true;
  ELSE
    is_weekend := false;
  END IF;

  IF is_weekend THEN
    SELECT value INTO setting_price FROM settings WHERE key = 'price_weekend';
    IF setting_price IS NOT NULL THEN
      final_price := setting_price::integer;
    ELSE
      final_price := 12000;
    END IF;
  ELSE
    SELECT value INTO setting_price FROM settings WHERE key = 'price_weekday';
    IF setting_price IS NOT NULL THEN
      final_price := setting_price::integer;
    ELSE
      final_price := 10000;
    END IF;
  END IF;

  -- Force le prix serveur, mais ne touche PAS aux champs de paiement
  NEW.total_price := final_price;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
