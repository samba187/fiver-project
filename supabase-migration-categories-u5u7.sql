-- ============================================================
-- FIVEUR ACADEMY — Fusion des catégories U5 et U7 en "U5/U7"
-- À exécuter UNIQUEMENT au moment où la branche preprod passe en production :
-- l'ancien code de prod ne connaît pas "U5/U7" et n'afficherait plus la
-- catégorie de ces enfants.
-- ============================================================

UPDATE academy_registrations
SET categorie_foot = 'U5/U7'
WHERE categorie_foot IN ('U5', 'U7');
