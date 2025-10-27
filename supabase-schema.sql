-- =============================================
-- AI-Coder Supabase Database Schema
-- =============================================
-- This script creates all necessary tables, indexes, policies, and triggers
-- for the AI-Coder application to work with Supabase.
--
-- HOW TO USE:
-- 1. Open your Supabase Dashboard
-- 2. Go to SQL Editor (left sidebar)
-- 3. Click "New Query"
-- 4. Copy and paste this entire file
-- 5. Click "Run" button (or press Ctrl+Enter)
-- 6. Verify tables appear in Table Editor
-- =============================================

-- =============================================
-- 1. DROP EXISTING OBJECTS (if they exist)
-- =============================================

-- Drop triggers first
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
DROP TRIGGER IF EXISTS update_model_downloads_updated_at ON model_downloads;
DROP TRIGGER IF EXISTS update_training_sessions_updated_at ON training_sessions;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop policies
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
DROP POLICY IF EXISTS "Users can insert their own projects" ON projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;

DROP POLICY IF EXISTS "Users can view their own model downloads" ON model_downloads;
DROP POLICY IF EXISTS "Users can insert their own model downloads" ON model_downloads;
DROP POLICY IF EXISTS "Users can update their own model downloads" ON model_downloads;

DROP POLICY IF EXISTS "Users can view their own training sessions" ON training_sessions;
DROP POLICY IF EXISTS "Users can insert their own training sessions" ON training_sessions;
DROP POLICY IF EXISTS "Users can update their own training sessions" ON training_sessions;

-- Drop tables (cascade will also drop indexes)
DROP TABLE IF EXISTS training_sessions CASCADE;
DROP TABLE IF EXISTS model_downloads CASCADE;
DROP TABLE IF EXISTS projects CASCADE;

-- =============================================
-- 2. CREATE TABLES
-- =============================================

-- Create projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  files JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  port INTEGER,
  url TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Create model_downloads table
CREATE TABLE model_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_name VARCHAR(255) NOT NULL,
  model_path TEXT NOT NULL,
  file_size BIGINT,
  download_status VARCHAR(20) DEFAULT 'pending' CHECK (download_status IN ('pending', 'completed', 'failed')),
  downloaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create training_sessions table
CREATE TABLE training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_name VARCHAR(255) NOT NULL,
  pattern_type VARCHAR(100),
  confidence_score FLOAT DEFAULT 0.0 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  training_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);

CREATE INDEX idx_model_downloads_user_id ON model_downloads(user_id);
CREATE INDEX idx_model_downloads_status ON model_downloads(download_status);

CREATE INDEX idx_training_sessions_user_id ON training_sessions(user_id);
CREATE INDEX idx_training_sessions_pattern_type ON training_sessions(pattern_type);

-- =============================================
-- 4. ENABLE ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 5. CREATE SECURITY POLICIES
-- =============================================

-- Projects policies
CREATE POLICY "Users can view their own projects" 
  ON projects FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects" 
  ON projects FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" 
  ON projects FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" 
  ON projects FOR DELETE 
  USING (auth.uid() = user_id);

-- Model downloads policies
CREATE POLICY "Users can view their own model downloads" 
  ON model_downloads FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own model downloads" 
  ON model_downloads FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own model downloads" 
  ON model_downloads FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Training sessions policies
CREATE POLICY "Users can view their own training sessions" 
  ON training_sessions FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own training sessions" 
  ON training_sessions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own training sessions" 
  ON training_sessions FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 6. CREATE AUTOMATIC UPDATE FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 7. CREATE TRIGGERS FOR AUTO-UPDATE
-- =============================================

CREATE TRIGGER update_projects_updated_at 
  BEFORE UPDATE ON projects
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_model_downloads_updated_at 
  BEFORE UPDATE ON model_downloads
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_sessions_updated_at 
  BEFORE UPDATE ON training_sessions
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 8. VERIFICATION QUERIES (OPTIONAL)
-- =============================================

-- Uncomment these lines to verify the schema after running:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('projects', 'model_downloads', 'training_sessions');
-- SELECT policy_name, table_name FROM pg_policies WHERE schemaname = 'public';

-- =============================================
-- END OF SCHEMA
-- =============================================
-- After running this script:
-- 1. Check "Table Editor" to verify tables exist
-- 2. Check "Database" > "Policies" to verify RLS policies
-- 3. Start using AI-Coder with Supabase storage!
-- =============================================
