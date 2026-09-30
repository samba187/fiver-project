-- ============================================================
-- FIVEUR ACADEMY — Autorisation de sortie
-- À exécuter dans le SQL Editor de Supabase (sans risque pour la prod actuelle)
-- ============================================================

-- NULL = non renseigné, true = rentre seul, false = un adulte vient
ALTER TABLE academy_registrations
  ADD COLUMN IF NOT EXISTS autorisation_sortie BOOLEAN;
