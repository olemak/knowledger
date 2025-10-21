-- Move extensions to dedicated schema for security

-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move pg_trgm extension
ALTER EXTENSION pg_trgm SET SCHEMA extensions;

-- Move vector extension
ALTER EXTENSION vector SET SCHEMA extensions;

-- Grant usage on extensions schema to public
GRANT USAGE ON SCHEMA extensions TO public;
