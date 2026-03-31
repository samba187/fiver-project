-- Migration 5: Critical Security Patches
-- Run this in your Supabase SQL Editor

-- ==============================================================================
-- 1. ENFORCE SECURE PRICING LOGIC VIA DATABASE TRIGGER
-- Prevents clients from manipulating the `total_price` during reservation inserts
-- ==============================================================================

CREATE OR REPLACE FUNCTION enforce_reservation_price()
RETURNS TRIGGER AS $$
DECLARE
  day_of_week integer;
  is_weekend boolean;
  setting_price text;
  final_price integer;
BEGIN
  -- Extract day of week from NEW.date (0 = Sunday... 6 = Saturday)
  day_of_week := EXTRACT(DOW FROM NEW.date::date);
  
  -- In Fiveur Arena logic: Friday (5), Saturday (6), Sunday (0) are Weekend prices
  IF day_of_week = 0 OR day_of_week = 5 OR day_of_week = 6 THEN
    is_weekend := true;
  ELSE
    is_weekend := false;
  END IF;

  -- Fetch price from settings if available, else fallback to defaults
  IF is_weekend THEN
    SELECT value INTO setting_price FROM settings WHERE key = 'price_weekend';
    IF setting_price IS NOT NULL THEN
      final_price := setting_price::integer;
    ELSE
      final_price := 12000;
    END IF;
  ELSE
    SELECT value INTO setting_price FROM settings WHERE key = 'price_weekday';
    IF setting_price IS NOT NULL THEN
      final_price := setting_price::integer;
    ELSE
      final_price := 10000;
    END IF;
  END IF;

  -- Overwrite whatever the client sent with the server-verified price
  NEW.total_price := final_price;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enforce_reservation_price ON reservations;

CREATE TRIGGER trg_enforce_reservation_price
BEFORE INSERT OR UPDATE ON reservations
FOR EACH ROW
EXECUTE FUNCTION enforce_reservation_price();


-- ==============================================================================
-- 2. SECURE CONTACTS TABLE (MISSING RLS)
-- Prevents public from reading or deleting messages sent via the contact form
-- ==============================================================================

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Public can only insert
CREATE POLICY "Public can insert contacts"
ON contacts FOR INSERT TO public
WITH CHECK (true);

-- Authenticated staff can do everything else
CREATE POLICY "Staff can select contacts"
ON contacts FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Staff can update contacts"
ON contacts FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "Staff can delete contacts"
ON contacts FOR DELETE TO authenticated
USING (true);
