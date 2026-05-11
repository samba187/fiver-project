-- ============================================================
-- FIVEUR ACADEMY — Transport / Chauffeur (Part 2)
-- Migration: Découplage des réservations par enfant
-- ============================================================

-- 1. Autoriser plusieurs réservations pour un même parent le même jour
ALTER TABLE transport_bookings DROP CONSTRAINT IF EXISTS transport_bookings_parent_id_date_seance_key;

-- 2. Ajouter le nom de l'enfant dans la réservation
ALTER TABLE transport_bookings ADD COLUMN IF NOT EXISTS enfant_nom TEXT;

-- 3. Mettre à jour la contrainte du statut pour inclure "en_attente"
ALTER TABLE transport_bookings DROP CONSTRAINT IF EXISTS transport_bookings_statut_check;
ALTER TABLE transport_bookings ADD CONSTRAINT transport_bookings_statut_check CHECK (statut IN ('en_attente', 'confirme', 'annule'));
ALTER TABLE transport_bookings ALTER COLUMN statut SET DEFAULT 'en_attente';

-- Note : Les anciennes réservations sans "enfant_nom" n'auront pas de nom, 
-- mais cela ne gênera pas car l'admin a les infos du parent.
