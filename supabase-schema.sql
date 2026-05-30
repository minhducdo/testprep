-- WineExamPrep Supabase Schema
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  airkit_uuid TEXT UNIQUE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  city TEXT,
  country TEXT,
  zip_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Purchases table
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bundle_id TEXT NOT NULL,
  stripe_session_id TEXT UNIQUE,
  amount_cents INTEGER,
  level TEXT,
  pack TEXT,
  promo BOOLEAN DEFAULT false,
  purchased_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX idx_users_airkit_uuid ON users(airkit_uuid);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_purchases_user_id ON purchases(user_id);
CREATE INDEX idx_purchases_bundle_id ON purchases(bundle_id);

-- Prevent duplicate purchases (same user, same bundle)
CREATE UNIQUE INDEX idx_unique_user_bundle ON purchases(user_id, bundle_id);

-- Auto-update updated_at on users
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Row Level Security (disabled since we use service role key from server only)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- No RLS policies needed — all access is via service role key from Vercel API routes
-- This means the tables are locked down by default (no public access)
