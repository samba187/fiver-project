  -- ============================================================
  -- FIVEUR ACADEMY PRO — Migration V3
  -- Table: academy_registrations & Storage
  -- ============================================================

  -- 1. Création de la table si elle n'existe pas
  CREATE TABLE IF NOT EXISTS academy_registrations (
    id SERIAL PRIMARY KEY,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    nom_pere TEXT,
    date_naissance DATE,
    sexe TEXT DEFAULT 'M' CHECK (sexe IN ('M', 'F')),
    telephone_parent TEXT,
    adresse TEXT,
    football BOOLEAN DEFAULT true,
    centre_loisirs BOOLEAN DEFAULT false,
    categorie_foot TEXT,
    tarif_football INTEGER DEFAULT 0,
    tarif_loisirs INTEGER DEFAULT 0,
    tarif_total INTEGER DEFAULT 0,
    montant_paye INTEGER DEFAULT 0,
    statut_paiement TEXT DEFAULT 'en_attente' CHECK (statut_paiement IN ('paye', 'partiel', 'en_attente')),
    date_paiement DATE,
    date_limite_paiement DATE,
    observations TEXT,
    photo_url TEXT,
    moyen_paiement TEXT,
    frais_inscription INTEGER DEFAULT 1000,
    frais_inscription_paye BOOLEAN DEFAULT false,
    inscription_fin_de_mois BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- 2. Ajout des colonnes au cas où la table existait déjà
  ALTER TABLE academy_registrations 
    ADD COLUMN IF NOT EXISTS nom_pere TEXT,
    ADD COLUMN IF NOT EXISTS moyen_paiement TEXT,
    ADD COLUMN IF NOT EXISTS photo_url TEXT,
    ADD COLUMN IF NOT EXISTS tarif_total INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tarif_football INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tarif_loisirs INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS frais_inscription INTEGER DEFAULT 1000,
    ADD COLUMN IF NOT EXISTS frais_inscription_paye BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS inscription_fin_de_mois BOOLEAN DEFAULT false;

  -- 3. Sécurité (RLS)
  ALTER TABLE academy_registrations ENABLE ROW LEVEL SECURITY;

  -- Suppression des anciennes policies pour éviter l'erreur "already exists"
  DROP POLICY IF EXISTS "Allow all for authenticated" ON academy_registrations;
  DROP POLICY IF EXISTS "Allow read for anon" ON academy_registrations;

  -- Création des roles
  CREATE POLICY "Allow all for authenticated" ON academy_registrations
    FOR ALL USING (true) WITH CHECK (true);

  CREATE POLICY "Allow read for anon" ON academy_registrations
    FOR SELECT USING (true);

  -- 4. CREATION DU BUCKET STORAGE POUR LES PHOTOS ACADEMY
  INSERT INTO storage.buckets (id, name, public) 
  VALUES ('academy_photos', 'academy_photos', true)
  ON CONFLICT (id) DO NOTHING;

  -- Suppression des policies storage au cas où
  DROP POLICY IF EXISTS "Public Access Photos" ON storage.objects;
  DROP POLICY IF EXISTS "Insert Access Photos" ON storage.objects;
  DROP POLICY IF EXISTS "Update Access Photos" ON storage.objects;
  DROP POLICY IF EXISTS "Delete Access Photos" ON storage.objects;

  -- Re-création des policies storage
  CREATE POLICY "Public Access Photos" ON storage.objects
    FOR SELECT USING (bucket_id = 'academy_photos');
  CREATE POLICY "Insert Access Photos" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'academy_photos' AND auth.role() = 'authenticated');
  CREATE POLICY "Update Access Photos" ON storage.objects
    FOR UPDATE USING (bucket_id = 'academy_photos' AND auth.role() = 'authenticated');
  CREATE POLICY "Delete Access Photos" ON storage.objects
    FOR DELETE USING (bucket_id = 'academy_photos' AND auth.role() = 'authenticated');
