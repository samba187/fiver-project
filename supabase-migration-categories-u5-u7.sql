-- ============================================================
-- FIVEUR ACADEMY — Catégories U5 / U7 séparées, sans Baby, U19 ni Senior
--   Baby  -> U5
--   U5/U7 -> U5 (5 ans et moins) ou U7 (6-7 ans) selon la date de naissance
-- ============================================================

-- ---------- PARTIE 1 : réglages (sans risque, à exécuter maintenant) ----------
-- Prix par catégorie : le prix "Baby" devient celui des U5, celui des "U5/U7" celui des U7
UPDATE settings
SET value = jsonb_set(
  value::jsonb, '{tarifsCategorie}',
  ((value::jsonb -> 'tarifsCategorie') - 'Baby' - 'U5/U7' - 'U19' - 'Senior')
  || jsonb_strip_nulls(jsonb_build_object(
       'U5', coalesce(value::jsonb -> 'tarifsCategorie' -> 'U5', value::jsonb -> 'tarifsCategorie' -> 'Baby'),
       'U7', coalesce(value::jsonb -> 'tarifsCategorie' -> 'U7', value::jsonb -> 'tarifsCategorie' -> 'U5/U7')))
)::text
WHERE key = 'academy_tarifs' AND jsonb_typeof(value::jsonb -> 'tarifsCategorie') = 'object';

-- Planning : le créneau "U5/U7" sert aux U5 et aux U7
UPDATE settings
SET value = (
  (value::jsonb - 'Baby' - 'U5/U7' - 'U19' - 'Senior')
  || jsonb_strip_nulls(jsonb_build_object(
       'U5', coalesce(value::jsonb -> 'U5', value::jsonb -> 'U5/U7', value::jsonb -> 'Baby'),
       'U7', coalesce(value::jsonb -> 'U7', value::jsonb -> 'U5/U7')))
)::text
WHERE key = 'academy_planning';

-- ---------- PARTIE 2 : fiches des enfants ----------
-- À exécuter AU MOMENT où preprod passe en production (le code actuel de prod
-- ne connaît pas encore U5 / U7 séparés). Avant ça, ces enfants apparaissent
-- sur preprod avec la mention "ancienne catégorie".

-- Combien d'enfants sont concernés ?
SELECT categorie_foot, count(*) FROM academy_registrations
WHERE categorie_foot IN ('Baby', 'U5/U7', 'U19', 'Senior')
GROUP BY categorie_foot;

UPDATE academy_registrations SET categorie_foot = 'U5' WHERE categorie_foot = 'Baby';

UPDATE academy_registrations
SET categorie_foot = CASE
  WHEN date_naissance IS NOT NULL AND date_part('year', age(current_date, date_naissance)) <= 5 THEN 'U5'
  ELSE 'U7' END
WHERE categorie_foot = 'U5/U7';

-- U19 / Senior n'existent plus : s'il y en a (voir le comptage ci-dessus),
-- choisir leur nouvelle catégorie à la main dans la fiche de l'enfant.
