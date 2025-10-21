-- Re-enable RLS on knowledge table
ALTER TABLE knowledge ENABLE ROW LEVEL SECURITY;

-- Re-enable RLS on knowledge_embeddings table
ALTER TABLE knowledge_embeddings ENABLE ROW LEVEL SECURITY;

-- Drop existing overly permissive policies on knowledge table
DROP POLICY IF EXISTS "Users can read own data" ON knowledge;
DROP POLICY IF EXISTS "Users can update own data" ON knowledge;

-- Create proper RLS policies for knowledge table
-- Users can read their own knowledge entries
CREATE POLICY "Users can select own knowledge" ON knowledge FOR SELECT USING (
  auth.uid() = user_id
);

-- Users can read workspace knowledge they're members of
CREATE POLICY "Users can select workspace knowledge" ON knowledge FOR SELECT USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

-- Users can insert knowledge entries
CREATE POLICY "Users can insert knowledge" ON knowledge FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

-- Users can update their own knowledge entries
CREATE POLICY "Users can update own knowledge" ON knowledge FOR UPDATE USING (
  auth.uid() = user_id
) WITH CHECK (
  auth.uid() = user_id
);

-- Users can delete their own knowledge entries
CREATE POLICY "Users can delete own knowledge" ON knowledge FOR DELETE USING (
  auth.uid() = user_id
);

-- Users can delete workspace knowledge if they're admin or owner
CREATE POLICY "Admins can delete workspace knowledge" ON knowledge FOR DELETE USING (
  workspace_id IN (
    SELECT workspace_members.workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
  )
);

-- Re-create knowledge_embeddings policies
DROP POLICY IF EXISTS "Users can access knowledge embeddings" ON knowledge_embeddings;
DROP POLICY IF EXISTS "Users can insert knowledge embeddings" ON knowledge_embeddings;
DROP POLICY IF EXISTS "Users can update knowledge embeddings" ON knowledge_embeddings;

-- Users can only access embeddings for knowledge they own or can access
CREATE POLICY "Users can select own embeddings" ON knowledge_embeddings FOR SELECT USING (
  knowledge_id IN (
    SELECT id FROM knowledge WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can select workspace embeddings" ON knowledge_embeddings FOR SELECT USING (
  knowledge_id IN (
    SELECT knowledge.id FROM knowledge
    JOIN workspace_members ON knowledge.workspace_id = workspace_members.workspace_id
    WHERE workspace_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own embeddings" ON knowledge_embeddings FOR INSERT WITH CHECK (
  knowledge_id IN (
    SELECT id FROM knowledge WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own embeddings" ON knowledge_embeddings FOR UPDATE USING (
  knowledge_id IN (
    SELECT id FROM knowledge WHERE user_id = auth.uid()
  )
) WITH CHECK (
  knowledge_id IN (
    SELECT id FROM knowledge WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own embeddings" ON knowledge_embeddings FOR DELETE USING (
  knowledge_id IN (
    SELECT id FROM knowledge WHERE user_id = auth.uid()
  )
);

-- Ensure service_role bypass is configured (this is automatic in Supabase)
-- but we need to be explicit about who can perform certain operations
