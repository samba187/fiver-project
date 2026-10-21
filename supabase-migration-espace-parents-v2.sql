-- ============================================================
-- FIVEUR ACADEMY — Espace Parents, mise à jour n°2
-- (à exécuter si supabase-migration-espace-parents.sql a déjà été lancé)
--   * paiement de plusieurs mois en un seul dépôt
--   * pas de capture obligatoire pour un paiement Cash ou Autre
--   * téléphone du parent sur les reçus
-- Uniquement des ajouts / remplacements de fonctions : aucune donnée modifiée.
-- ============================================================

-- Paiement de plusieurs mois en une fois : [{"mois": "2026-10", "montant": 1000}, ...]
ALTER TABLE academy_preuves_paiement ADD COLUMN IF NOT EXISTS details JSONB;

-- Toutes les données de l'espace parent en un seul appel
CREATE OR REPLACE FUNCTION parent_donnees(p_token TEXT) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v parent_comptes := _parent_session(p_token);
  v_saison TEXT := _saison_courante();
BEGIN
  RETURN jsonb_build_object(
    'parent', jsonb_build_object('telephone', v.telephone, 'nom', v.nom),
    'saison', v_saison,
    'tarifs', (SELECT value::jsonb FROM settings WHERE key = 'academy_tarifs'),
    'planning', (SELECT value::jsonb FROM settings WHERE key = 'academy_planning'),
    'enfants', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', r.id, 'nom', r.nom, 'prenom', r.prenom, 'date_naissance', r.date_naissance, 'sexe', r.sexe,
        'telephone_parent', r.telephone_parent,
        'categorie_foot', r.categorie_foot, 'football', r.football, 'centre_loisirs', r.centre_loisirs,
        'photo_url', r.photo_url, 'badge_code', r.badge_code, 'saison', r.saison, 'created_at', r.created_at,
        'tarif_total', r.tarif_total, 'tarif_football', r.tarif_football, 'tarif_loisirs', r.tarif_loisirs,
        'frais_inscription', r.frais_inscription, 'frais_inscription_paye', r.frais_inscription_paye,
        'inscription_fin_de_mois', r.inscription_fin_de_mois,
        'autorisation_photos', coalesce(r.autorisation_photos, true), 'autorisation_sortie', r.autorisation_sortie,
        'academy_payments_history', coalesce((
          SELECT jsonb_agg(jsonb_build_object('id', h.id, 'mois_concerne', h.mois_concerne, 'montant', h.montant,
                                              'moyen_paiement', h.moyen_paiement, 'description', h.description,
                                              'date_paiement', h.date_paiement) ORDER BY h.date_paiement DESC)
          FROM academy_payments_history h WHERE h.registration_id = r.id), '[]'::jsonb),
        'preuves', coalesce((
          SELECT jsonb_agg(jsonb_build_object('id', p.id, 'mois_concerne', p.mois_concerne, 'montant', p.montant,
                                              'moyen_paiement', p.moyen_paiement, 'statut', p.statut, 'details', p.details,
                                              'motif_refus', p.motif_refus, 'created_at', p.created_at) ORDER BY p.created_at DESC)
          FROM academy_preuves_paiement p WHERE p.registration_id = r.id), '[]'::jsonb),
        'evaluations', coalesce((
          SELECT jsonb_agg(jsonb_build_object('id', e.id, 'date_eval', e.date_eval, 'discipline', e.discipline,
                                              'comportement', e.comportement, 'progression', e.progression,
                                              'commentaire', e.commentaire, 'auteur', e.auteur) ORDER BY e.date_eval DESC, e.id DESC)
          FROM academy_evaluations e WHERE e.registration_id = r.id AND e.visible), '[]'::jsonb),
        'photos', CASE WHEN coalesce(r.autorisation_photos, true) THEN coalesce((
          SELECT jsonb_agg(jsonb_build_object('id', g.id, 'url', g.url, 'legende', g.legende, 'created_at', g.created_at) ORDER BY g.created_at DESC)
          FROM academy_galerie g WHERE g.registration_id = r.id AND g.visible), '[]'::jsonb) ELSE '[]'::jsonb END,
        'seances', coalesce((
          SELECT jsonb_agg(jsonb_build_object('date', s.date_seance, 'reponse', s.reponse_parent, 'presence', s.presence_reelle) ORDER BY s.date_seance)
          FROM academy_seance_presences s WHERE s.registration_id = r.id AND s.date_seance >= current_date - 180), '[]'::jsonb),
        'scans', coalesce((
          SELECT jsonb_agg(DISTINCT pr.date_presence)
          FROM academy_presences pr WHERE pr.registration_id = r.id AND pr.autorise AND pr.date_presence >= current_date - 180), '[]'::jsonb)
      ) ORDER BY r.prenom)
      FROM academy_registrations r
      WHERE r.saison = v_saison AND tel8(r.telephone_parent) = v.telephone), '[]'::jsonb),
    'annonces', coalesce((
      SELECT jsonb_agg(jsonb_build_object('id', a.id, 'titre', a.titre, 'contenu', a.contenu, 'categorie', a.categorie, 'created_at', a.created_at) ORDER BY a.created_at DESC)
      FROM (
        SELECT * FROM academy_annonces
        WHERE categorie IS NULL OR categorie IN (
          SELECT categorie_foot FROM academy_registrations WHERE saison = v_saison AND tel8(telephone_parent) = v.telephone)
        ORDER BY created_at DESC LIMIT 20
      ) a), '[]'::jsonb),
    'messages', coalesce((
      SELECT jsonb_agg(jsonb_build_object('id', m.id, 'sens', m.sens, 'contenu', m.contenu, 'auteur', m.auteur, 'lu', m.lu, 'created_at', m.created_at) ORDER BY m.created_at)
      FROM (SELECT * FROM parent_messages WHERE parent_id = v.id ORDER BY created_at DESC LIMIT 200) m), '[]'::jsonb)
  );
END $$;

-- Dépôt d'un paiement (un ou plusieurs mois, et/ou les frais), à valider par l'admin.
-- p_details : [{"mois": "YYYY-MM" | "FRAIS", "montant": 1000}, ...]
-- Capture obligatoire sauf pour un paiement Cash ou Autre.
DROP FUNCTION IF EXISTS parent_deposer_paiement(TEXT, INTEGER, TEXT, INTEGER, TEXT, TEXT);
CREATE OR REPLACE FUNCTION parent_deposer_paiement(p_token TEXT, p_registration_id INTEGER, p_details JSONB, p_moyen TEXT, p_image TEXT DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v parent_comptes := _parent_session(p_token);
  r academy_registrations := _parent_enfant(v, p_registration_id);
  v_moyen TEXT := left(coalesce(nullif(trim(p_moyen), ''), 'Autre'), 40);
  v_ligne JSONB;
  v_montant INTEGER;
  v_mois TEXT[] := '{}';
  v_details JSONB := '[]'::jsonb;
  v_total INTEGER := 0;
BEGIN
  IF p_details IS NULL OR jsonb_typeof(p_details) <> 'array' OR jsonb_array_length(p_details) = 0 OR jsonb_array_length(p_details) > 13 THEN
    RAISE EXCEPTION 'MOIS_INVALIDE';
  END IF;
  FOR v_ligne IN SELECT value FROM jsonb_array_elements(p_details) LOOP
    IF jsonb_typeof(v_ligne->'mois') IS DISTINCT FROM 'string'
       OR ((v_ligne->>'mois') !~ '^\d{4}-\d{2}$' AND (v_ligne->>'mois') <> 'FRAIS')
       OR (v_ligne->>'mois') = ANY(v_mois) THEN
      RAISE EXCEPTION 'MOIS_INVALIDE';
    END IF;
    IF jsonb_typeof(v_ligne->'montant') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'MONTANT_INVALIDE'; END IF;
    v_montant := round((v_ligne->>'montant')::numeric);
    IF v_montant <= 0 OR v_montant > 1000000 THEN RAISE EXCEPTION 'MONTANT_INVALIDE'; END IF;
    v_mois := v_mois || (v_ligne->>'mois');
    v_details := v_details || jsonb_build_array(jsonb_build_object('mois', v_ligne->>'mois', 'montant', v_montant));
    v_total := v_total + v_montant;
  END LOOP;

  IF p_image IS NULL AND v_moyen NOT IN ('Cash', 'Autre') THEN RAISE EXCEPTION 'CAPTURE_REQUISE'; END IF;
  IF p_image IS NOT NULL AND (p_image NOT LIKE 'data:image/%' OR length(p_image) > 2000000) THEN RAISE EXCEPTION 'IMAGE_INVALIDE'; END IF;

  -- Un mois déjà en attente de validation ne peut pas être redéposé
  IF EXISTS (
    SELECT 1 FROM academy_preuves_paiement p
    CROSS JOIN LATERAL jsonb_array_elements(coalesce(p.details, jsonb_build_array(jsonb_build_object('mois', p.mois_concerne)))) d
    WHERE p.registration_id = r.id AND p.statut = 'en_attente' AND d->>'mois' = ANY(v_mois)
  ) THEN
    RAISE EXCEPTION 'DEJA_EN_ATTENTE';
  END IF;
  IF (SELECT count(*) FROM academy_preuves_paiement WHERE registration_id = r.id AND statut = 'en_attente') >= 10 THEN
    RAISE EXCEPTION 'TROP_DE_DEPOTS';
  END IF;

  INSERT INTO academy_preuves_paiement (registration_id, parent_id, mois_concerne, montant, moyen_paiement, image, details)
  VALUES (r.id, v.id, v_mois[1], v_total, v_moyen, p_image, v_details);
END $$;

GRANT EXECUTE ON FUNCTION parent_donnees(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION parent_deposer_paiement(TEXT, INTEGER, JSONB, TEXT, TEXT) TO anon, authenticated;
