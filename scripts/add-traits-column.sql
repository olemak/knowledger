-- Add traits column to knowledge table
ALTER TABLE knowledge ADD COLUMN IF NOT EXISTS traits JSONB DEFAULT '[]';

-- Add validation constraint
ALTER TABLE knowledge ADD CONSTRAINT IF NOT EXISTS valid_traits_format 
CHECK (jsonb_typeof(traits) = 'array');

-- Add GIN index for efficient trait queries
CREATE INDEX IF NOT EXISTS idx_knowledge_traits ON knowledge USING GIN(traits);

-- Update existing records to have empty traits array
UPDATE knowledge SET traits = '[]' WHERE traits IS NULL;

-- Show sample of updated records
SELECT id, title, traits FROM knowledge LIMIT 3;