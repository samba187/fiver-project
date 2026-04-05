-- Migration 6: Add Email Persistence to Reservations
-- Run this in your Supabase SQL Editor

ALTER TABLE reservations 
  ADD COLUMN IF NOT EXISTS email text;

-- No change needed to RLS if already enabled for public insert
