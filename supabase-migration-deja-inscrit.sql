-- ============================================================
-- FIVEUR ACADEMY — Ajout du statut "déjà inscrit" (tarif réduit)
-- À exécuter dans le SQL Editor de Supabase
-- ============================================================

ALTER TABLE academy_registrations
  ADD COLUMN IF NOT EXISTS deja_inscrit BOOLEAN DEFAULT false;

COMMENT ON COLUMN academy_registrations.deja_inscrit IS
  'Coché quand l''enfant était déjà inscrit une saison précédente : frais d''inscription réduits (équipement uniquement) au lieu du tarif nouvel inscrit.';
