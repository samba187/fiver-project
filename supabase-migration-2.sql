-- Migration 2: Academy players & Centre de Loisirs children management
-- Run this in your Supabase SQL Editor

-- Academy players
CREATE TABLE IF NOT EXISTS academy_players (
  id serial PRIMARY KEY,
  full_name text NOT NULL,
  date_of_birth date,
  category text NOT NULL,
  parent_name text,
  parent_phone text,
  parent_email text,
  license_number text,
  license_expiry date,
  photo_url text,
  status text DEFAULT 'active',
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Centre de Loisirs children
CREATE TABLE IF NOT EXISTS loisirs_children (
  id serial PRIMARY KEY,
  full_name text NOT NULL,
  date_of_birth date,
  age integer,
  category text NOT NULL,
  parent_name text NOT NULL,
  parent_phone text NOT NULL,
  parent_email text,
  license_number text,
  license_expiry date,
  inscription_date date DEFAULT CURRENT_DATE,
  status text DEFAULT 'active',
  notes text,
  created_at timestamptz DEFAULT now()
);
