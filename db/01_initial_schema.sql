-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create custom types
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'member', 'readonly');
CREATE TYPE knowledge_visibility AS ENUM ('private', 'workspace', 'public');
CREATE TYPE knowledge_relationship AS ENUM ('relates_to', 'extends', 'contradicts', 'builds_on');

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workspaces table
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{"visibility": "private", "allow_external_sharing": false}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workspace members table
CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  config JSONB DEFAULT '{"auto_tag": true, "visibility": "private", "ai_processing": true}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Knowledge entries table
CREATE TABLE knowledge (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Knowledge relationships table (for linking entries)
CREATE TABLE knowledge_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID NOT NULL REFERENCES knowledge(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES knowledge(id) ON DELETE CASCADE,
  relationship knowledge_relationship NOT NULL DEFAULT 'relates_to',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(source_id, target_id, relationship)
);

-- Create indexes for performance
CREATE INDEX idx_knowledge_user_id ON knowledge(user_id);
CREATE INDEX idx_knowledge_project_id ON knowledge(project_id);
CREATE INDEX idx_knowledge_workspace_id ON knowledge(workspace_id);
CREATE INDEX idx_knowledge_tags ON knowledge USING GIN(tags);
CREATE INDEX idx_knowledge_created_at ON knowledge(created_at DESC);

-- Full-text search index
CREATE INDEX idx_knowledge_fts ON knowledge USING GIN(to_tsvector('english', title || ' ' || content));

-- Project indexes
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_workspace_id ON projects(workspace_id);

-- Workspace indexes
CREATE INDEX idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user_id ON workspace_members(user_id);

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_knowledge_updated_at BEFORE UPDATE ON knowledge FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_relationships ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read their own data
CREATE POLICY "Users can read own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);

-- Projects: users can access their own projects and workspace projects they're members of
CREATE POLICY "Users can access own projects" ON projects FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access workspace projects" ON projects FOR SELECT USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

-- Knowledge: users can access their own knowledge and workspace knowledge they're members of
CREATE POLICY "Users can access own knowledge" ON knowledge FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access workspace knowledge" ON knowledge FOR SELECT USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

-- Workspaces: users can access workspaces they're members of
CREATE POLICY "Users can access member workspaces" ON workspaces FOR SELECT USING (
  id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);
CREATE POLICY "Owners can manage workspaces" ON workspaces FOR ALL USING (auth.uid() = owner_id);

-- Workspace members: users can see members of workspaces they belong to
CREATE POLICY "Users can see workspace members" ON workspace_members FOR SELECT USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);

-- Knowledge relationships: same access as knowledge entries
CREATE POLICY "Users can access knowledge relationships" ON knowledge_relationships FOR SELECT USING (
  source_id IN (SELECT id FROM knowledge WHERE user_id = auth.uid() OR workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ))
);