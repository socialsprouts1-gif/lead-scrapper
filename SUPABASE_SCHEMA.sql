-- ─────────────────────────────────────────────────────────────────────────────
-- LeadFinder — Supabase Database Schema
-- HOW TO USE:
--   1. Open your Supabase project → SQL Editor → New query
--   2. Paste this ENTIRE file → click the green RUN button
--   3. You should see "Success. No rows returned"
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. SEARCHES — every search made on the website
CREATE TABLE IF NOT EXISTS searches (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword      TEXT        NOT NULL,
  city         TEXT        NOT NULL,
  user_ip      TEXT,
  user_name    TEXT        DEFAULT 'Guest',
  user_email   TEXT,
  result_count INTEGER     DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 2. LEADS — all scraped business data from Apify
CREATE TABLE IF NOT EXISTS leads (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword     TEXT,
  city        TEXT,
  name        TEXT        NOT NULL,
  address     TEXT,
  phone       TEXT,
  rating      NUMERIC(3,1),
  reviews     INTEGER     DEFAULT 0,
  maps_url    TEXT,
  instagram   TEXT,
  linkedin    TEXT,
  facebook    TEXT,
  website     TEXT,
  photo_url   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. VISITORS — every person who visits the website
CREATE TABLE IF NOT EXISTS visitors (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  ip          TEXT,
  user_agent  TEXT,
  geo_city    TEXT,
  geo_country TEXT,
  geo_region  TEXT,
  user_name   TEXT        DEFAULT 'Guest',
  user_email  TEXT,
  visited_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes for fast queries ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_searches_keyword ON searches(keyword);
CREATE INDEX IF NOT EXISTS idx_searches_city    ON searches(city);
CREATE INDEX IF NOT EXISTS idx_searches_created ON searches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_keyword    ON leads(keyword);
CREATE INDEX IF NOT EXISTS idx_leads_city       ON leads(city);
CREATE INDEX IF NOT EXISTS idx_visitors_created ON visitors(visited_at DESC);

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads    ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "backend_insert_searches" ON searches FOR INSERT WITH CHECK (true);
CREATE POLICY "backend_select_searches" ON searches FOR SELECT USING (true);
CREATE POLICY "backend_insert_leads"    ON leads    FOR INSERT WITH CHECK (true);
CREATE POLICY "backend_select_leads"    ON leads    FOR SELECT USING (true);
CREATE POLICY "backend_insert_visitors" ON visitors FOR INSERT WITH CHECK (true);
CREATE POLICY "backend_select_visitors" ON visitors FOR SELECT USING (true);

-- ── Database Migrations (for existing installations) ──────────────────────────
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS user_name TEXT DEFAULT 'Guest';
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE searches ADD COLUMN IF NOT EXISTS user_name TEXT DEFAULT 'Guest';
ALTER TABLE searches ADD COLUMN IF NOT EXISTS user_email TEXT;
