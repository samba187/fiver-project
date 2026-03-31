-- Migration 3: Add amount_paid column to reservations (for partial payment tracking)
-- Run this in your Supabase SQL editor.

ALTER TABLE reservations ADD COLUMN IF NOT EXISTS amount_paid integer DEFAULT 0;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS total_price integer DEFAULT 0;
