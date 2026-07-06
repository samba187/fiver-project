-- ============================================================
-- FIVEUR ARENA — Caisse (suivi manuel des recettes/dépenses)
-- Migration: 1 table + RLS + realtime
-- ============================================================

CREATE TABLE IF NOT EXISTS cash_entries (
  id SERIAL PRIMARY KEY,
  entry_date DATE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('five', 'academy', 'sport_feminin', 'navette', 'autre', 'depense')),
  label TEXT,
  amount INTEGER NOT NULL CHECK (amount >= 0),
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cash_entries_date ON cash_entries (entry_date DESC);

-- ============================================================
-- RLS — CASH_ENTRIES
-- Same pattern as transport_bookings: staff (authenticated) full access
-- ============================================================
ALTER TABLE cash_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ce_staff_all" ON cash_entries;

CREATE POLICY "ce_staff_all" ON cash_entries
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- REALTIME — so the owner sees new entries live without refresh
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE cash_entries;
