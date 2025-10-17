-- Add refs column to knowledge table  
-- Using JSONB to store array of reference objects
ALTER TABLE knowledge ADD COLUMN refs JSONB DEFAULT '[]';

-- Create index for efficient reference queries
CREATE INDEX idx_knowledge_refs ON knowledge USING GIN(refs);

-- Simple validation - ensure refs is an array
ALTER TABLE knowledge ADD CONSTRAINT valid_refs_format 
CHECK (jsonb_typeof(refs) = 'array');

-- Comment describing the expected reference format
COMMENT ON COLUMN knowledge.refs IS
'Array of reference objects in format: 
[{
  "uri": "https://example.com or file:// or isbn: etc",
  "title": "Title or context description", 
  "attributed_to": "Author, speaker, organization",
  "reference_type": "citation|testimony",
  "statement": "Key quote or finding (optional)"
}]';