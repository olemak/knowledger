-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Users can access knowledge embeddings" ON knowledge_embeddings;

-- Create simpler RLS policies for knowledge_embeddings
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