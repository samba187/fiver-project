-- ============================================================
-- FIVEUR — Vérification AVANT la fusion preprod -> prod
-- Lecture seule : ne modifie rien. Toutes les colonnes "ok_" doivent valoir true.
-- ============================================================

SELECT
  (SELECT value FROM settings WHERE key = 'saison_courante')                          AS saison_courante,
  (SELECT string_agg(nom || ' (' || statut || ')', ', ' ORDER BY nom) FROM saisons)  AS saisons,

  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'academy_registrations' AND column_name = 'saison')              AS ok_col_saison_academy,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'academy_registrations' AND column_name = 'badge_code')          AS ok_col_badge_code,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'academy_registrations' AND column_name = 'deja_inscrit')        AS ok_col_deja_inscrit,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'academy_registrations' AND column_name = 'autorisation_sortie') AS ok_col_autorisation_sortie,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sport_feminin_inscriptions' AND column_name = 'saison')        AS ok_col_saison_feminin,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transport_parents' AND column_name = 'saison')                 AS ok_col_saison_transport,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'academy_presences')                                            AS ok_table_presences,
  EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_academy_badge_saison')                                                    AS ok_index_anti_doublon_import,
  EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'uniq_presence_autorisee_par_jour')                                            AS ok_index_presence_jour,
  EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_saison_academy')                                                             AS ok_trigger_saison,

  -- Doivent être à 0
  (SELECT count(*) FROM academy_registrations WHERE saison IS NULL OR saison = '')        AS nb_enfants_sans_saison,
  (SELECT count(*) FROM sport_feminin_inscriptions WHERE saison IS NULL OR saison = '')   AS nb_feminin_sans_saison,
  (SELECT count(*) FROM transport_parents WHERE saison IS NULL OR saison = '')            AS nb_parents_sans_saison,

  -- À connaître (pas bloquant) : enfants sans code carte (à générer dans l'onglet Cartes)
  (SELECT count(*) FROM academy_registrations
     WHERE badge_code IS NULL AND saison = (SELECT value FROM settings WHERE key = 'saison_courante')) AS nb_enfants_sans_code;

-- Doublons déjà présents dans la saison en cours (même nom + prénom) : à regarder avant d'importer
SELECT min(nom) AS nom, min(prenom) AS prenom, count(*) AS nb
FROM academy_registrations
WHERE saison = (SELECT value FROM settings WHERE key = 'saison_courante')
GROUP BY lower(trim(nom)), lower(trim(prenom))
HAVING count(*) > 1;
