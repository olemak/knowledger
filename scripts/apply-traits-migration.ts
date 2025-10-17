#!/usr/bin/env -S deno run --allow-all --env

import { createClient } from 'npm:@supabase/supabase-js@^2.0.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_PROJECT_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_KEY')!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase credentials');
  Deno.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

console.log('🚀 Applying traits migration...');

// Add traits column
const { error: addColumnError } = await supabase.rpc('exec_sql', {
  query: 'ALTER TABLE knowledge ADD COLUMN IF NOT EXISTS traits JSONB DEFAULT \'[]\';'
});

if (addColumnError) {
  console.error('Error adding traits column:', addColumnError);
} else {
  console.log('✅ Added traits column');
}

// Add validation constraint
const { error: constraintError } = await supabase.rpc('exec_sql', {
  query: 'ALTER TABLE knowledge ADD CONSTRAINT IF NOT EXISTS valid_traits_format CHECK (jsonb_typeof(traits) = \'array\');'
});

if (constraintError) {
  console.error('Error adding validation constraint:', constraintError);
} else {
  console.log('✅ Added traits validation constraint');
}

// Add index
const { error: indexError } = await supabase.rpc('exec_sql', {
  query: 'CREATE INDEX IF NOT EXISTS idx_knowledge_traits ON knowledge USING GIN(traits);'
});

if (indexError) {
  console.error('Error adding traits index:', indexError);
} else {
  console.log('✅ Added traits GIN index');
}

console.log('🎉 Traits migration applied successfully!');