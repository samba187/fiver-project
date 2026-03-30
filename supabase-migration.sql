-- Migration: Add payment tracking fields to reservations
-- Run this in your Supabase SQL Editor

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS payment_confirmed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS amount_paid integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_price integer DEFAULT 0;
