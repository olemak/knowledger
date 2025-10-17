-- Temporarily disable RLS for testing
-- This is NOT for production - only for development/testing

-- Disable RLS on knowledge table for testing
ALTER TABLE knowledge DISABLE ROW LEVEL SECURITY;

-- Create a test user entry
INSERT INTO users (id, email, name) 
VALUES ('temp-user-123', 'test@knowledger.dev', 'Test User')
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email,
  name = EXCLUDED.name;