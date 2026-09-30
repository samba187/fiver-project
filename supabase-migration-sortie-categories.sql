-- ============================================================
-- FIVEUR ACADEMY — Autorisation de sortie + nouvelles catégories
-- À exécuter dans le SQL Editor de Supabase
-- ============================================================

-- 1. Autorisation de sortie (NULL = non renseigné, true = rentre seul, false = un adulte vient)
ALTER TABLE academy_registrations
  ADD COLUMN IF NOT EXISTS autorisation_sortie BOOLEAN;

-- 2. Les catégories U5 et U7 sont fusionnées en une seule catégorie "U5/U7" (5-7 ans)
UPDATE academy_registrations
SET categorie_foot = 'U5/U7'
WHERE categorie_foot IN ('U5', 'U7');
