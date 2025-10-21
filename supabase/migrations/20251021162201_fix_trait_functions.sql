-- Fix trait functions with search_path set

-- Drop dependent indexes first
DROP INDEX IF EXISTS idx_knowledge_trait_keys;
DROP INDEX IF EXISTS idx_knowledge_trait_values;

-- get_trait_keys
DROP FUNCTION IF EXISTS get_trait_keys(JSONB);
CREATE OR REPLACE FUNCTION get_trait_keys(traits_json JSONB)
RETURNS TEXT[] AS $$
BEGIN
  RETURN ARRAY(
    SELECT jsonb_array_elements(traits_json)->>'key'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE
SET search_path = public;

-- get_trait_values
DROP FUNCTION IF EXISTS get_trait_values(JSONB);
CREATE OR REPLACE FUNCTION get_trait_values(traits_json JSONB)
RETURNS TEXT[] AS $$
BEGIN
  RETURN ARRAY(
    SELECT jsonb_array_elements(traits_json)->>'value'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE
SET search_path = public;

-- has_trait
DROP FUNCTION IF EXISTS has_trait(JSONB, TEXT, TEXT);
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
$$ LANGUAGE plpgsql IMMUTABLE
SET search_path = public;

-- Recreate functional indexes
CREATE INDEX idx_knowledge_trait_keys ON knowledge USING GIN(get_trait_keys(traits));
CREATE INDEX idx_knowledge_trait_values ON knowledge USING GIN(get_trait_values(traits));
