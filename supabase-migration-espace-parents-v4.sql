-- ============================================================
-- FIVEUR ACADEMY — mise à jour n°4
--   * cours de Coran (+300 MRU / mois, réglable dans Paramètres)
--   * enfant qui arrête en cours de saison (gardé, en rouge, plus rien à payer)
--   * photos dans les annonces (à tous les parents ou à une catégorie)
-- Ajouts uniquement. Rejouable.
-- ============================================================

ALTER TABLE academy_registrations ADD COLUMN IF NOT EXISTS coran BOOLEAN DEFAULT false;
ALTER TABLE academy_registrations ADD COLUMN IF NOT EXISTS statut_inscription TEXT DEFAULT 'actif';
ALTER TABLE academy_registrations ADD COLUMN IF NOT EXISTS date_arret DATE;
ALTER TABLE academy_registrations ADD COLUMN IF NOT EXISTS motif_arret TEXT;
ALTER TABLE academy_annonces ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}';

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
        'categorie_foot', r.categorie_foot, 'football', r.football, 'centre_loisirs', r.centre_loisirs, 'coran', coalesce(r.coran, false),
        'statut_inscription', coalesce(r.statut_inscription, 'actif'), 'date_arret', r.date_arret,
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
                                              'moyen_paiement', p.moyen_paiement, 'statut', p.statut, 'details', p.details, 'note', p.note,
                                              'motif_refus', p.motif_refus, 'traite_le', p.traite_le, 'created_at', p.created_at) ORDER BY p.created_at DESC)
          FROM academy_preuves_paiement p WHERE p.registration_id = r.id), '[]'::jsonb),
        'evaluations', coalesce((
          SELECT jsonb_agg(jsonb_build_object('id', e.id, 'date_eval', e.date_eval, 'discipline', e.discipline,
                                              'comportement', e.comportement, 'progression', e.progression,
                                              'commentaire', e.commentaire, 'auteur', e.auteur, 'created_at', e.created_at) ORDER BY e.date_eval DESC, e.id DESC)
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
      SELECT jsonb_agg(jsonb_build_object('id', a.id, 'titre', a.titre, 'contenu', a.contenu, 'categorie', a.categorie,
                                          'photos', coalesce(to_jsonb(a.photos), '[]'::jsonb), 'created_at', a.created_at) ORDER BY a.created_at DESC)
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

GRANT EXECUTE ON FUNCTION parent_donnees(TEXT) TO anon, authenticated;

-- Prix du Coran : 300 MRU par mois (modifiable ensuite dans Academy > Paramètres)
UPDATE settings
SET value = jsonb_set(value::jsonb, '{tarifCoran}', coalesce(value::jsonb -> 'tarifCoran', '300'::jsonb))::text
WHERE key = 'academy_tarifs';
