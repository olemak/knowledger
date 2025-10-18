-- Enable pgvector extension for vector operations
CREATE EXTENSION IF NOT EXISTS vector;

-- Create embeddings table for knowledge entries
CREATE TABLE knowledge_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_id UUID NOT NULL REFERENCES knowledge(id) ON DELETE CASCADE,
  content_embedding vector(768), -- Google text-embedding-004 size
  model_name TEXT NOT NULL DEFAULT 'text-embedding-004',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(knowledge_id, model_name)
);

-- Create HNSW index for fast similarity search
CREATE INDEX idx_knowledge_embeddings_content ON knowledge_embeddings 
USING hnsw (content_embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- Regular indexes for filtering
CREATE INDEX idx_knowledge_embeddings_knowledge_id ON knowledge_embeddings(knowledge_id);
CREATE INDEX idx_knowledge_embeddings_model_name ON knowledge_embeddings(model_name);

-- Add updated_at trigger
CREATE TRIGGER update_knowledge_embeddings_updated_at 
BEFORE UPDATE ON knowledge_embeddings 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policy
ALTER TABLE knowledge_embeddings ENABLE ROW LEVEL SECURITY;

-- Users can access embeddings for knowledge they can access
CREATE POLICY "Users can access knowledge embeddings" ON knowledge_embeddings FOR SELECT USING (
  knowledge_id IN (
    SELECT id FROM knowledge 
    WHERE user_id = auth.uid()
  )
);

-- Allow inserting embeddings for knowledge entries the user owns
CREATE POLICY "Users can insert knowledge embeddings" ON knowledge_embeddings FOR INSERT WITH CHECK (
  knowledge_id IN (
    SELECT id FROM knowledge 
    WHERE user_id = auth.uid()
  )
);

-- Allow updating embeddings for knowledge entries the user owns
CREATE POLICY "Users can update knowledge embeddings" ON knowledge_embeddings FOR UPDATE USING (
  knowledge_id IN (
    SELECT id FROM knowledge 
    WHERE user_id = auth.uid()
  )
);

-- Function to find similar knowledge entries
CREATE OR REPLACE FUNCTION find_similar_knowledge(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS TABLE (
  knowledge_id uuid,
  title text,
  content text,
  tags text[],
  similarity float,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    k.id,
    k.title,
    k.content,
    k.tags,
    1 - (ke.content_embedding <=> query_embedding) as similarity,
    k.created_at
  FROM knowledge k
  JOIN knowledge_embeddings ke ON k.id = ke.knowledge_id
  WHERE 
    (k.user_id = p_user_id OR k.workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = p_user_id
    ))
    AND 1 - (ke.content_embedding <=> query_embedding) > match_threshold
  ORDER BY ke.content_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to get embedding stats
CREATE OR REPLACE FUNCTION get_embedding_stats(p_user_id uuid DEFAULT auth.uid())
RETURNS TABLE (
  total_embeddings bigint,
  models_used text[],
  avg_content_length float,
  last_updated timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(ke.id),
    ARRAY_AGG(DISTINCT ke.model_name),
    AVG(LENGTH(k.content))::float,
    MAX(ke.updated_at)
  FROM knowledge_embeddings ke
  JOIN knowledge k ON ke.knowledge_id = k.id
  WHERE k.user_id = p_user_id OR k.workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = p_user_id
  );
END;
$$;
