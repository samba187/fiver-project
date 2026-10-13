-- ============================================================
-- FIVEUR ACADEMY — Espace Parents / Coach / Admin
-- À exécuter dans le SQL Editor de Supabase.
-- Uniquement des AJOUTS (nouvelles tables, une colonne, des fonctions) :
-- aucune table existante n'est modifiée, la prod actuelle n'est pas impactée.
--
-- Sécurité : les parents ne sont PAS des utilisateurs Supabase. Ils n'ont aucun
-- accès direct aux tables ; tout passe par les fonctions parent_* ci-dessous,
-- qui vérifient leur session et ne renvoient que les données de LEURS enfants.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Autorisation photos/vidéos (fiche d'inscription)
ALTER TABLE academy_registrations ADD COLUMN IF NOT EXISTS autorisation_photos BOOLEAN DEFAULT true;

-- ---------- Comptes parents ----------
CREATE TABLE IF NOT EXISTS parent_comptes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telephone TEXT UNIQUE NOT NULL,            -- 8 derniers chiffres
  nom TEXT,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  derniere_connexion TIMESTAMPTZ
);

-- Mot de passe et sessions : jamais lisibles directement (RLS sans aucune policy)
CREATE TABLE IF NOT EXISTS parent_secrets (
  parent_id UUID PRIMARY KEY REFERENCES parent_comptes(id) ON DELETE CASCADE,
  mot_de_passe_hash TEXT NOT NULL,
  echecs INT NOT NULL DEFAULT 0,
  bloque_jusqua TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS parent_sessions (
  token TEXT PRIMARY KEY,
  parent_id UUID NOT NULL REFERENCES parent_comptes(id) ON DELETE CASCADE,
  expire_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------- Paiements déposés par les parents (capture d'écran) ----------
CREATE TABLE IF NOT EXISTS academy_preuves_paiement (
  id SERIAL PRIMARY KEY,
  registration_id INTEGER NOT NULL REFERENCES academy_registrations(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES parent_comptes(id) ON DELETE SET NULL,
  mois_concerne TEXT NOT NULL,               -- 'YYYY-MM' ou 'FRAIS'
  montant INTEGER NOT NULL CHECK (montant > 0),
  moyen_paiement TEXT,
  image TEXT,                                -- capture compressée (data URL)
  statut TEXT NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'valide', 'refuse')),
  motif_refus TEXT,
  traite_par TEXT,
  traite_le TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_preuves_statut ON academy_preuves_paiement (statut, created_at DESC);

-- ---------- Séances : réponse des parents + présence pointée par le coach ----------
CREATE TABLE IF NOT EXISTS academy_seance_presences (
  id SERIAL PRIMARY KEY,
  registration_id INTEGER NOT NULL REFERENCES academy_registrations(id) ON DELETE CASCADE,
  date_seance DATE NOT NULL,
  reponse_parent TEXT CHECK (reponse_parent IN ('present', 'absent')),
  presence_reelle TEXT CHECK (presence_reelle IN ('present', 'absent')),
  maj_parent_le TIMESTAMPTZ,
  maj_coach_le TIMESTAMPTZ,
  maj_coach_par TEXT,
  UNIQUE (registration_id, date_seance)
);
CREATE INDEX IF NOT EXISTS idx_seance_presences_date ON academy_seance_presences (date_seance);

-- ---------- Suivi sportif ----------
CREATE TABLE IF NOT EXISTS academy_evaluations (
  id SERIAL PRIMARY KEY,
  registration_id INTEGER NOT NULL REFERENCES academy_registrations(id) ON DELETE CASCADE,
  date_eval DATE NOT NULL DEFAULT CURRENT_DATE,
  discipline SMALLINT CHECK (discipline BETWEEN 1 AND 5),
  comportement SMALLINT CHECK (comportement BETWEEN 1 AND 5),
  progression SMALLINT CHECK (progression BETWEEN 1 AND 5),
  commentaire TEXT,
  auteur TEXT,
  visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_evaluations_reg ON academy_evaluations (registration_id);

-- ---------- Photos des joueurs ----------
CREATE TABLE IF NOT EXISTS academy_galerie (
  id SERIAL PRIMARY KEY,
  registration_id INTEGER NOT NULL REFERENCES academy_registrations(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  legende TEXT,
  auteur TEXT,
  visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_galerie_reg ON academy_galerie (registration_id);

-- Images envoyées par les parents (photo de profil), servies par /api/image/<id>
CREATE TABLE IF NOT EXISTS academy_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------- Messages et annonces ----------
CREATE TABLE IF NOT EXISTS parent_messages (
  id SERIAL PRIMARY KEY,
  parent_id UUID NOT NULL REFERENCES parent_comptes(id) ON DELETE CASCADE,
  sens TEXT NOT NULL CHECK (sens IN ('parent', 'academie')),
  contenu TEXT NOT NULL,
  auteur TEXT,
  lu BOOLEAN NOT NULL DEFAULT false,         -- lu par le destinataire
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_parent_messages ON parent_messages (parent_id, created_at);

CREATE TABLE IF NOT EXISTS academy_annonces (
  id SERIAL PRIMARY KEY,
  titre TEXT NOT NULL,
  contenu TEXT,
  categorie TEXT,                            -- NULL = toutes les catégories
  auteur TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------- Comptes coachs créés depuis l'admin ----------
CREATE TABLE IF NOT EXISTS staff_comptes (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  nom TEXT,
  role TEXT NOT NULL DEFAULT 'coach',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------- Sécurité (RLS) ----------
ALTER TABLE parent_comptes ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_preuves_paiement ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_seance_presences ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_galerie ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_annonces ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_comptes ENABLE ROW LEVEL SECURITY;

-- Le personnel connecté (admin / coach) gère tout ; parent_secrets et parent_sessions n'ont aucune policy.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['parent_comptes', 'academy_preuves_paiement', 'academy_seance_presences', 'academy_evaluations',
                           'academy_galerie', 'academy_images', 'parent_messages', 'academy_annonces', 'staff_comptes']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "staff_all" ON %I', t);
    EXECUTE format('CREATE POLICY "staff_all" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- ============================================================
-- Fonctions internes
-- ============================================================

CREATE OR REPLACE FUNCTION tel8(p TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
  SELECT right(regexp_replace(coalesce(p, ''), '\D', '', 'g'), 8)
$$;

CREATE OR REPLACE FUNCTION _saison_courante() RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT value FROM settings WHERE key = 'saison_courante'
$$;

CREATE OR REPLACE FUNCTION _parent_session(p_token TEXT) RETURNS parent_comptes
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v parent_comptes;
BEGIN
  SELECT c.* INTO v
  FROM parent_sessions s JOIN parent_comptes c ON c.id = s.parent_id
  WHERE s.token = p_token AND s.expire_at > now() AND c.actif;
  IF NOT FOUND THEN RAISE EXCEPTION 'SESSION_EXPIREE'; END IF;
  RETURN v;
END $$;

CREATE OR REPLACE FUNCTION _parent_enfant(p_parent parent_comptes, p_registration_id INTEGER) RETURNS academy_registrations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r academy_registrations;
BEGIN
  SELECT * INTO r FROM academy_registrations
  WHERE id = p_registration_id AND tel8(telephone_parent) = p_parent.telephone;
  IF NOT FOUND THEN RAISE EXCEPTION 'ENFANT_INCONNU'; END IF;
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION _parent_nouvelle_session(p_parent_id UUID) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_token TEXT := encode(gen_random_bytes(32), 'hex');
BEGIN
  DELETE FROM parent_sessions WHERE expire_at < now();
  INSERT INTO parent_sessions (token, parent_id, expire_at) VALUES (v_token, p_parent_id, now() + interval '90 days');
  UPDATE parent_comptes SET derniere_connexion = now() WHERE id = p_parent_id;
  RETURN v_token;
END $$;

REVOKE EXECUTE ON FUNCTION _saison_courante() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION _parent_session(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION _parent_enfant(parent_comptes, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION _parent_nouvelle_session(UUID) FROM PUBLIC;

-- ============================================================
-- Fonctions appelées par l'Espace Parents
-- ============================================================

-- Création du compte : téléphone + code joueur imprimé sur la carte d'un de ses enfants
CREATE OR REPLACE FUNCTION parent_creer_compte(p_telephone TEXT, p_code_joueur TEXT, p_mot_de_passe TEXT, p_nom TEXT DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_tel TEXT := tel8(p_telephone);
  v_id UUID;
BEGIN
  IF length(v_tel) <> 8 THEN RETURN jsonb_build_object('erreur', 'TELEPHONE_INVALIDE'); END IF;
  IF length(coalesce(p_mot_de_passe, '')) < 6 THEN RETURN jsonb_build_object('erreur', 'MOT_DE_PASSE_COURT'); END IF;
  IF EXISTS (SELECT 1 FROM parent_comptes WHERE telephone = v_tel) THEN RETURN jsonb_build_object('erreur', 'COMPTE_EXISTE'); END IF;
  IF NOT EXISTS (
    SELECT 1 FROM academy_registrations
    WHERE upper(badge_code) = upper(trim(coalesce(p_code_joueur, ''))) AND tel8(telephone_parent) = v_tel
  ) THEN
    RETURN jsonb_build_object('erreur', 'CODE_INCORRECT');
  END IF;

  INSERT INTO parent_comptes (telephone, nom) VALUES (v_tel, nullif(trim(coalesce(p_nom, '')), '')) RETURNING id INTO v_id;
  INSERT INTO parent_secrets (parent_id, mot_de_passe_hash) VALUES (v_id, crypt(p_mot_de_passe, gen_salt('bf')));
  RETURN jsonb_build_object('token', _parent_nouvelle_session(v_id));
END $$;

-- Connexion. Renvoie une erreur sans exception, pour que le compteur d'échecs soit bien enregistré.
CREATE OR REPLACE FUNCTION parent_connexion(p_telephone TEXT, p_mot_de_passe TEXT)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_compte parent_comptes;
  v_secret parent_secrets;
BEGIN
  SELECT * INTO v_compte FROM parent_comptes WHERE telephone = tel8(p_telephone);
  IF NOT FOUND THEN RETURN jsonb_build_object('erreur', 'IDENTIFIANTS'); END IF;
  IF NOT v_compte.actif THEN RETURN jsonb_build_object('erreur', 'COMPTE_DESACTIVE'); END IF;

  SELECT * INTO v_secret FROM parent_secrets WHERE parent_id = v_compte.id;
  IF v_secret.bloque_jusqua IS NOT NULL AND v_secret.bloque_jusqua > now() THEN
    RETURN jsonb_build_object('erreur', 'BLOQUE');
  END IF;

  IF v_secret.mot_de_passe_hash <> crypt(coalesce(p_mot_de_passe, ''), v_secret.mot_de_passe_hash) THEN
    UPDATE parent_secrets
    SET echecs = CASE WHEN echecs + 1 >= 8 THEN 0 ELSE echecs + 1 END,
        bloque_jusqua = CASE WHEN echecs + 1 >= 8 THEN now() + interval '15 minutes' ELSE bloque_jusqua END
    WHERE parent_id = v_compte.id;
    RETURN jsonb_build_object('erreur', 'IDENTIFIANTS');
  END IF;

  UPDATE parent_secrets SET echecs = 0, bloque_jusqua = NULL WHERE parent_id = v_compte.id;
  RETURN jsonb_build_object('token', _parent_nouvelle_session(v_compte.id));
END $$;

CREATE OR REPLACE FUNCTION parent_deconnexion(p_token TEXT) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM parent_sessions WHERE token = p_token
$$;

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
                                              'moyen_paiement', p.moyen_paiement, 'statut', p.statut,
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

-- Photo de profil de l'enfant (image compressée envoyée par le parent)
CREATE OR REPLACE FUNCTION parent_maj_photo(p_token TEXT, p_registration_id INTEGER, p_image TEXT) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v parent_comptes := _parent_session(p_token);
  r academy_registrations := _parent_enfant(v, p_registration_id);
  v_id UUID;
  v_url TEXT;
BEGIN
  IF p_image IS NULL OR p_image NOT LIKE 'data:image/%' OR length(p_image) > 1500000 THEN RAISE EXCEPTION 'IMAGE_INVALIDE'; END IF;
  INSERT INTO academy_images (data) VALUES (p_image) RETURNING id INTO v_id;
  v_url := '/api/image/' || v_id;
  UPDATE academy_registrations SET photo_url = v_url WHERE id = r.id;
  RETURN v_url;
END $$;

CREATE OR REPLACE FUNCTION parent_autorisation_photos(p_token TEXT, p_registration_id INTEGER, p_autorise BOOLEAN) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v parent_comptes := _parent_session(p_token);
  r academy_registrations := _parent_enfant(v, p_registration_id);
BEGIN
  UPDATE academy_registrations SET autorisation_photos = p_autorise WHERE id = r.id;
END $$;

-- Dépôt d'une capture de paiement, à valider par l'admin
CREATE OR REPLACE FUNCTION parent_deposer_paiement(p_token TEXT, p_registration_id INTEGER, p_mois TEXT, p_montant INTEGER, p_moyen TEXT, p_image TEXT)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v parent_comptes := _parent_session(p_token);
  r academy_registrations := _parent_enfant(v, p_registration_id);
BEGIN
  IF p_mois IS NULL OR (p_mois !~ '^\d{4}-\d{2}$' AND p_mois <> 'FRAIS') THEN RAISE EXCEPTION 'MOIS_INVALIDE'; END IF;
  IF p_montant IS NULL OR p_montant <= 0 OR p_montant > 1000000 THEN RAISE EXCEPTION 'MONTANT_INVALIDE'; END IF;
  IF p_image IS NULL OR p_image NOT LIKE 'data:image/%' OR length(p_image) > 2000000 THEN RAISE EXCEPTION 'IMAGE_INVALIDE'; END IF;
  IF (SELECT count(*) FROM academy_preuves_paiement WHERE registration_id = r.id AND statut = 'en_attente') >= 10 THEN
    RAISE EXCEPTION 'TROP_DE_DEPOTS';
  END IF;
  INSERT INTO academy_preuves_paiement (registration_id, parent_id, mois_concerne, montant, moyen_paiement, image)
  VALUES (r.id, v.id, p_mois, p_montant, left(p_moyen, 40), p_image);
END $$;

-- Réponse du parent à une séance : 'present', 'absent' ou NULL (annuler)
CREATE OR REPLACE FUNCTION parent_repondre_seance(p_token TEXT, p_registration_id INTEGER, p_date DATE, p_reponse TEXT)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v parent_comptes := _parent_session(p_token);
  r academy_registrations := _parent_enfant(v, p_registration_id);
BEGIN
  IF p_date < current_date OR p_date > current_date + 60 THEN RAISE EXCEPTION 'DATE_INVALIDE'; END IF;
  IF p_reponse IS NOT NULL AND p_reponse NOT IN ('present', 'absent') THEN RAISE EXCEPTION 'REPONSE_INVALIDE'; END IF;
  INSERT INTO academy_seance_presences (registration_id, date_seance, reponse_parent, maj_parent_le)
  VALUES (r.id, p_date, p_reponse, now())
  ON CONFLICT (registration_id, date_seance)
  DO UPDATE SET reponse_parent = EXCLUDED.reponse_parent, maj_parent_le = now();
END $$;

CREATE OR REPLACE FUNCTION parent_envoyer_message(p_token TEXT, p_contenu TEXT) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v parent_comptes := _parent_session(p_token);
BEGIN
  IF length(trim(coalesce(p_contenu, ''))) = 0 OR length(p_contenu) > 2000 THEN RAISE EXCEPTION 'MESSAGE_INVALIDE'; END IF;
  IF (SELECT count(*) FROM parent_messages WHERE parent_id = v.id AND sens = 'parent' AND created_at > now() - interval '1 hour') >= 30 THEN
    RAISE EXCEPTION 'TROP_DE_MESSAGES';
  END IF;
  INSERT INTO parent_messages (parent_id, sens, contenu, auteur) VALUES (v.id, 'parent', trim(p_contenu), coalesce(v.nom, v.telephone));
END $$;

CREATE OR REPLACE FUNCTION parent_messages_lus(p_token TEXT) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v parent_comptes := _parent_session(p_token);
BEGIN
  UPDATE parent_messages SET lu = true WHERE parent_id = v.id AND sens = 'academie' AND NOT lu;
END $$;

-- Image publique (photo de profil) servie par /api/image/<id>
CREATE OR REPLACE FUNCTION image_publique(p_id UUID) RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT data FROM academy_images WHERE id = p_id
$$;

-- ============================================================
-- Fonction réservée au personnel connecté
-- ============================================================
CREATE OR REPLACE FUNCTION admin_parent_mot_de_passe(p_parent_id UUID, p_mot_de_passe TEXT) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF coalesce(auth.role(), '') <> 'authenticated' THEN RAISE EXCEPTION 'NON_AUTORISE'; END IF;
  IF length(coalesce(p_mot_de_passe, '')) < 6 THEN RAISE EXCEPTION 'MOT_DE_PASSE_COURT'; END IF;
  UPDATE parent_secrets SET mot_de_passe_hash = crypt(p_mot_de_passe, gen_salt('bf')), echecs = 0, bloque_jusqua = NULL
  WHERE parent_id = p_parent_id;
  DELETE FROM parent_sessions WHERE parent_id = p_parent_id;
END $$;

GRANT EXECUTE ON FUNCTION parent_creer_compte(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION parent_connexion(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION parent_deconnexion(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION parent_donnees(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION parent_maj_photo(TEXT, INTEGER, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION parent_autorisation_photos(TEXT, INTEGER, BOOLEAN) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION parent_deposer_paiement(TEXT, INTEGER, TEXT, INTEGER, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION parent_repondre_seance(TEXT, INTEGER, DATE, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION parent_envoyer_message(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION parent_messages_lus(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION image_publique(UUID) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION admin_parent_mot_de_passe(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_parent_mot_de_passe(UUID, TEXT) TO authenticated;
