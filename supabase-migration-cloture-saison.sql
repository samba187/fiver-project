-- ============================================================
-- FIVEUR ACADEMY — Clôture de saison en une seule transaction
-- À exécuter dans le SQL Editor de Supabase
--
-- Avant : la clôture enchaînait 5 écritures depuis le navigateur. Une coupure
-- au milieu laissait la nouvelle saison créée mais pas activée, et on ne pouvait
-- plus relancer ("la saison existe déjà"). Ici, tout passe ou rien ne change.
-- ============================================================

CREATE OR REPLACE FUNCTION cloturer_saison(
  p_ancienne TEXT,
  p_nouvelle TEXT,
  p_date_debut DATE,
  p_date_fin DATE,
  p_academy JSONB,          -- [{"id": 12, "categorie": "U11"}, ...] enfants à réinscrire
  p_feminine_ids INT[],     -- inscrites Sport Féminin à reconduire
  p_frais_reinscrit INT,    -- frais d'équipement des réinscrits (ancien inscrit)
  p_facturer_frais BOOLEAN  -- false = frais considérés comme déjà réglés
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_courante TEXT;
  v_nb_academy INT := 0;
  v_nb_feminine INT := 0;
  v_nb_transport INT := 0;
BEGIN
  IF coalesce(trim(p_nouvelle), '') = '' THEN
    RAISE EXCEPTION 'Le nom de la nouvelle saison est obligatoire.';
  END IF;

  -- Protège contre un double clic ou deux personnes qui clôturent en même temps
  SELECT value INTO v_courante FROM settings WHERE key = 'saison_courante' FOR UPDATE;
  IF v_courante IS NOT NULL AND v_courante <> p_ancienne THEN
    RAISE EXCEPTION 'La saison en cours est déjà %, rechargez la page.', v_courante;
  END IF;

  IF EXISTS (SELECT 1 FROM saisons WHERE nom = p_nouvelle) THEN
    RAISE EXCEPTION 'La saison % existe déjà.', p_nouvelle;
  END IF;

  -- 1. Nouvelle saison
  INSERT INTO saisons (nom, date_debut, date_fin, statut)
  VALUES (p_nouvelle, p_date_debut, p_date_fin, 'active');

  -- 2. Réinscription Academy : même carte QR, paiements remis à zéro,
  --    catégorie recalculée selon l'âge, tarif "ancien inscrit"
  INSERT INTO academy_registrations (
    nom, prenom, nom_pere, date_naissance, sexe, telephone_parent, adresse,
    football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total,
    photo_url, observations, badge_code, autorisation_sortie,
    deja_inscrit, frais_inscription, frais_inscription_paye,
    montant_paye, statut_paiement, inscription_fin_de_mois, saison
  )
  SELECT
    r.nom, r.prenom, r.nom_pere, r.date_naissance, r.sexe, r.telephone_parent, r.adresse,
    r.football, r.centre_loisirs, coalesce(nullif(x.categorie, ''), r.categorie_foot),
    r.tarif_football, r.tarif_loisirs, r.tarif_total,
    r.photo_url, r.observations, r.badge_code, r.autorisation_sortie,
    true, p_frais_reinscrit, NOT p_facturer_frais,
    0, 'en_attente', false, p_nouvelle
  FROM jsonb_to_recordset(coalesce(p_academy, '[]'::jsonb)) AS x(id INT, categorie TEXT)
  JOIN academy_registrations r ON r.id = x.id AND r.saison = p_ancienne;
  GET DIAGNOSTICS v_nb_academy = ROW_COUNT;

  -- 3. Sport Féminin
  INSERT INTO sport_feminin_inscriptions (
    nom, prenom, date_naissance, telephone, enfant_inscrit, enfant_nom_prenom, notes, statut, saison
  )
  SELECT f.nom, f.prenom, f.date_naissance, f.telephone, f.enfant_inscrit, f.enfant_nom_prenom, f.notes, 'confirmé', p_nouvelle
  FROM sport_feminin_inscriptions f
  WHERE f.id = ANY(coalesce(p_feminine_ids, '{}')) AND f.saison = p_ancienne;
  GET DIAGNOSTICS v_nb_feminine = ROW_COUNT;

  -- 4. Navette : un compte parent est unique (téléphone), il suit la nouvelle saison
  --    sinon il disparaîtrait de l'onglet Parents tout en continuant à réserver.
  UPDATE transport_parents SET saison = p_nouvelle WHERE saison = p_ancienne;
  GET DIAGNOSTICS v_nb_transport = ROW_COUNT;

  -- 5. Archive l'ancienne saison et bascule la saison courante
  UPDATE saisons SET statut = 'archivee', archived_at = NOW() WHERE nom = p_ancienne;

  INSERT INTO settings (key, value) VALUES ('saison_courante', p_nouvelle)
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

  RETURN jsonb_build_object(
    'academy', v_nb_academy,
    'feminine', v_nb_feminine,
    'transport', v_nb_transport
  );
END;
$$;

GRANT EXECUTE ON FUNCTION cloturer_saison(TEXT, TEXT, DATE, DATE, JSONB, INT[], INT, BOOLEAN) TO authenticated;
