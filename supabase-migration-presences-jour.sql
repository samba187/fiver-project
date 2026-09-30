-- ============================================================
-- FIVEUR ACADEMY — Une seule présence (accès autorisé) par enfant et par jour
-- À exécuter dans le SQL Editor de Supabase
-- ============================================================

-- 0. Rattrapage : des scans ont pu être enregistrés sans saison (bug du scanner),
--    ce qui les cachait de l'onglet Présences. On leur rend la saison de l'enfant.
UPDATE academy_presences p
SET saison = r.saison
FROM academy_registrations r
WHERE p.registration_id = r.id
  AND (p.saison IS NULL OR p.saison = '');

-- 1. Nettoyage : si un enfant a été scanné plusieurs fois le même jour,
--    on ne garde que le premier passage autorisé.
DELETE FROM academy_presences a
USING academy_presences b
WHERE a.autorise AND b.autorise
  AND a.badge_code = b.badge_code
  AND a.date_presence = b.date_presence
  AND a.id > b.id;

-- 2. Garantie en base : un second scan autorisé le même jour est rejeté
--    (l'application le traite comme "déjà présent", pas comme une erreur).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_presence_autorisee_par_jour
  ON academy_presences (badge_code, date_presence)
  WHERE autorise;
