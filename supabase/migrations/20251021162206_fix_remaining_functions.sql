-- Fix remaining functions with search_path set

-- find_similar_knowledge
DROP FUNCTION IF EXISTS find_similar_knowledge(extensions.vector, float, int, uuid);
CREATE OR REPLACE FUNCTION find_similar_knowledge(
  query_embedding extensions.vector(768),
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
SET search_path = public
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

-- get_embedding_stats
DROP FUNCTION IF EXISTS get_embedding_stats(uuid);
CREATE OR REPLACE FUNCTION get_embedding_stats(p_user_id uuid DEFAULT auth.uid())
RETURNS TABLE (
  total_embeddings bigint,
  models_used text[],
  avg_content_length float,
  last_updated timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- has_trait
DROP FUNCTION IF EXISTS has_trait(uuid, text, text);
CREATE OR REPLACE FUNCTION has_trait(p_knowledge_id uuid, p_key text, p_value text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM knowledge_traits
    WHERE knowledge_id = p_knowledge_id
      AND key = p_key
      AND value = p_value
  );
END;
$$ LANGUAGE plpgsql
STABLE
SET search_path = public;

-- get_trait_keys
DROP FUNCTION IF EXISTS get_trait_keys(uuid);
CREATE OR REPLACE FUNCTION get_trait_keys(p_knowledge_id uuid)
RETURNS TABLE (key text) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT k.key
  FROM knowledge_traits k
  WHERE k.knowledge_id = p_knowledge_id;
END;
$$ LANGUAGE plpgsql
STABLE
SET search_path = public;

-- get_trait_values
DROP FUNCTION IF EXISTS get_trait_values(text);
CREATE OR REPLACE FUNCTION get_trait_values(p_key text)
RETURNS TABLE (value text, count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT k.value, COUNT(*)
  FROM knowledge_traits k
  WHERE k.key = p_key
  GROUP BY k.value
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql
STABLE
SET search_path = public;
