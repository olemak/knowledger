-- Reassign existing data from test user to authenticated user
UPDATE knowledge 
SET user_id = '5ca6b3a5-3691-47f4-a0d1-2bd07ffc805e'
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000';

UPDATE projects
SET user_id = '5ca6b3a5-3691-47f4-a0d1-2bd07ffc805e'
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000';

-- Update the users table to reflect the real user
UPDATE users 
SET id = '5ca6b3a5-3691-47f4-a0d1-2bd07ffc805e'
WHERE id = '550e8400-e29b-41d4-a716-446655440000';
