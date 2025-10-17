-- Temporarily disable RLS for testing
-- This is NOT for production - only for development/testing

-- Disable RLS on knowledge table for testing
ALTER TABLE knowledge DISABLE ROW LEVEL SECURITY;

-- Create a test user entry with proper UUID
INSERT INTO users (id, email, name) 
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'test@knowledger.dev', 'Test User')
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email,
  name = EXCLUDED.name;
