-- Add traits column to knowledge table as JSONB array
ALTER TABLE knowledge ADD COLUMN traits JSONB DEFAULT '[]';

-- Create GIN index for efficient trait queries
CREATE INDEX idx_knowledge_traits ON knowledge USING GIN(traits);

-- Validate that traits is always an array
ALTER TABLE knowledge ADD CONSTRAINT valid_traits_format 
CHECK (jsonb_typeof(traits) = 'array');

-- Add comment describing the expected traits format
COMMENT ON COLUMN knowledge.traits IS
'Array of trait objects in format:
[{
  "key": "Fencer",
  "value": "Florentine School",
  "embedding": [0.123, 0.456, ...],  // Optional vector embedding
  "parent_id": "uuid-of-entity",     // Optional link to promoted entity
  "confidence": 0.8                  // Optional confidence score
}]

Traits are key-value pairs that describe the entity. They can optionally have embeddings for semantic similarity and parent_id when promoted to full entities.';

-- Create helper functions for trait operations

-- Function to extract trait keys for easy querying
CREATE OR REPLACE FUNCTION get_trait_keys(traits_json JSONB)
RETURNS TEXT[] AS $$
BEGIN
  RETURN ARRAY(
    SELECT jsonb_array_elements(traits_json)->>'key'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to extract trait values for searching
CREATE OR REPLACE FUNCTION get_trait_values(traits_json JSONB)
RETURNS TEXT[] AS $$
BEGIN
  RETURN ARRAY(
    SELECT jsonb_array_elements(traits_json)->>'value'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to search traits by key-value pairs
CREATE OR REPLACE FUNCTION has_trait(traits_json JSONB, search_key TEXT, search_value TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
  IF search_value IS NULL THEN
    -- Search by key only
    RETURN EXISTS (
      SELECT 1 FROM jsonb_array_elements(traits_json) AS trait
      WHERE trait->>'key' = search_key
    );
  ELSE
    -- Search by key and value
    RETURN EXISTS (
      SELECT 1 FROM jsonb_array_elements(traits_json) AS trait
      WHERE trait->>'key' = search_key AND trait->>'value' = search_value
    );
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create functional indexes for common trait queries
CREATE INDEX idx_knowledge_trait_keys ON knowledge USING GIN(get_trait_keys(traits));
CREATE INDEX idx_knowledge_trait_values ON knowledge USING GIN(get_trait_values(traits));

-- Example queries that will now be possible:
-- 
-- Find all entities with a specific trait key:
-- SELECT * FROM knowledge WHERE has_trait(traits, 'Fencer');
--
-- Find entities with specific trait key-value:
-- SELECT * FROM knowledge WHERE has_trait(traits, 'Fencer', 'Florentine School');
--
-- Search trait values with text search:
-- SELECT * FROM knowledge WHERE traits::text ILIKE '%Florentine%';
--
-- Get all trait keys across the knowledge base:
-- SELECT DISTINCT unnest(get_trait_keys(traits)) as trait_key FROM knowledge;