-- Fix RLS policies to handle orphaned data and service-level access

-- For knowledge table, also allow reading data without user_id (orphaned) for service operations
-- This is safer than allowing public access
DROP POLICY IF EXISTS "Users can select own knowledge" ON knowledge;
DROP POLICY IF EXISTS "Users can select workspace knowledge" ON knowledge;

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

-- For MVP: also allow reading knowledge without user_id (orphaned data)
-- Remove this policy once data is properly assigned user_ids
CREATE POLICY "Allow reading orphaned knowledge" ON knowledge FOR SELECT USING (
  user_id IS NULL
);

-- Ensure all knowledge entries have the test user as owner
-- This assigns ownership to orphaned records
UPDATE knowledge 
SET user_id = '550e8400-e29b-41d4-a716-446655440000'
WHERE user_id IS NULL;

-- Same for projects
UPDATE projects
SET user_id = '550e8400-e29b-41d4-a716-446655440000'
WHERE user_id IS NULL;

-- Same for workspace_members if needed
-- (less critical but good for consistency)
