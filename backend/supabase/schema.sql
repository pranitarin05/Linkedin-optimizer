-- LinkedIn Profile Optimizer - Supabase Schema
-- Run this in the Supabase SQL Editor

-- Enable pgvector extension for vector search
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium')),
  linkedin_public_id TEXT,
  persona TEXT DEFAULT 'general' CHECK (persona IN ('job_seeker', 'career_coach', 'service_provider', 'general')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PROFILE SNAPSHOTS TABLE
-- =====================================================
CREATE TABLE profile_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  raw_text TEXT,
  score INTEGER CHECK (score >= 0 AND score <= 100),
  metadata JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PROFILE UPDATES TABLE (Audit Log)
-- =====================================================
CREATE TABLE profile_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  source TEXT CHECK (source IN ('cv', 'custom')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'synced', 'manual_copy', 'deep_linked', 'failed')),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- BEST PRACTICE RULES TABLE (pgvector)
-- =====================================================
CREATE TABLE best_practice_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section TEXT NOT NULL,
  rule_text TEXT NOT NULL,
  priority INTEGER DEFAULT 1 CHECK (priority >= 1 AND priority <= 5),
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for vector similarity search
CREATE INDEX ON best_practice_rules
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE best_practice_rules ENABLE ROW LEVEL SECURITY;

-- Users can only read/update their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Users can manage their own snapshots
CREATE POLICY "Users can view own snapshots" ON profile_snapshots
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own snapshots" ON profile_snapshots
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own snapshots" ON profile_snapshots
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can manage their own updates
CREATE POLICY "Users can view own updates" ON profile_updates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own updates" ON profile_updates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own updates" ON profile_updates
  FOR UPDATE USING (auth.uid() = user_id);

-- Best practice rules are readable by all authenticated users
CREATE POLICY "Authenticated users can read rules" ON best_practice_rules
  FOR SELECT USING (auth.role() = 'authenticated');

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER profile_snapshots_updated_at
  BEFORE UPDATE ON profile_snapshots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- SEED DATA (Best Practice Rules)
-- =====================================================

INSERT INTO best_practice_rules (section, rule_text, priority) VALUES
-- Headline rules
('headline', 'Include your job title in the headline', 5),
('headline', 'Add your key skills or areas of expertise', 4),
('headline', 'Include a value proposition (what you help companies do)', 4),
('headline', 'Use relevant industry keywords for searchability', 3),
('headline', 'Keep headline under 220 characters', 3),

-- About rules
('about', 'Start with a strong opening line that hooks the reader', 5),
('about', 'Include your professional story and career journey', 4),
('about', 'Highlight key achievements with specific metrics', 4),
('about', 'Use short paragraphs (2-3 sentences) for readability', 3),
('about', 'End with a call to action or contact information', 3),

-- Experience rules
('experience', 'Use bullet points to list achievements, not duties', 5),
('experience', 'Start each bullet with a strong action verb', 4),
('experience', 'Include metrics and numbers to quantify impact', 4),
('experience', 'Focus on results and outcomes, not just responsibilities', 4),
('experience', 'Keep descriptions concise (100-300 characters each)', 3),

-- Skills rules
('skills', 'Add at least 5 relevant skills to your profile', 5),
('skills', 'Include a mix of technical and soft skills', 4),
('skills', 'Pin your top 3 most important skills', 4),
('skills', 'Get endorsements from colleagues for credibility', 3),

-- Education rules
('education', 'Include relevant coursework and projects', 3),
('education', 'Add honors, awards, and activities', 3),

-- Certification rules
('certifications', 'Add industry-recognized certifications', 4),
('certifications', 'Include credential IDs for verification', 3),
('certifications', 'Keep certification dates current', 3);
