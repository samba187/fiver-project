-- ============================================================
-- FIVEUR — Filet de sécurité : toute nouvelle inscription sans saison
-- est rangée dans la saison en cours (au lieu de '2025-2026' figé).
-- Sans risque pour la prod actuelle : aujourd'hui la saison en cours est
-- 2025-2026, donc le comportement ne change qu'après "Nouvelle saison".
-- ============================================================

CREATE OR REPLACE FUNCTION remplir_saison_courante() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.saison IS NULL OR NEW.saison = '' THEN
    SELECT value INTO NEW.saison FROM settings WHERE key = 'saison_courante';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE academy_registrations ALTER COLUMN saison DROP DEFAULT;
ALTER TABLE sport_feminin_inscriptions ALTER COLUMN saison DROP DEFAULT;
ALTER TABLE transport_parents ALTER COLUMN saison DROP DEFAULT;

DROP TRIGGER IF EXISTS trg_saison_academy ON academy_registrations;
CREATE TRIGGER trg_saison_academy BEFORE INSERT ON academy_registrations
  FOR EACH ROW EXECUTE FUNCTION remplir_saison_courante();

DROP TRIGGER IF EXISTS trg_saison_feminin ON sport_feminin_inscriptions;
CREATE TRIGGER trg_saison_feminin BEFORE INSERT ON sport_feminin_inscriptions
  FOR EACH ROW EXECUTE FUNCTION remplir_saison_courante();

DROP TRIGGER IF EXISTS trg_saison_transport ON transport_parents;
CREATE TRIGGER trg_saison_transport BEFORE INSERT ON transport_parents
  FOR EACH ROW EXECUTE FUNCTION remplir_saison_courante();
