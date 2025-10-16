#!/usr/bin/env -S deno run --allow-net --allow-read --allow-env

import { createClient } from '@supabase/supabase-js';
import { readTextFile } from '@std/fs';
import { join } from '@std/path';

// Load environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_PROJECT_URL');
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_KEY') || Deno.env.get('SUPABASE_KEY');

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - SUPABASE_PROJECT_URL');
  console.error('   - SUPABASE_SERVICE_KEY (or SUPABASE_KEY)');
  Deno.exit(1);
}

console.log('🚀 Setting up Knowledger database...');
console.log(`📍 Supabase URL: ${SUPABASE_URL}`);

// Initialize Supabase client with service key for admin operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runMigration(migrationFile: string) {
  try {
    console.log(`📄 Reading migration: ${migrationFile}`);
    const migrationPath = join('db', migrationFile);
    const sql = await readTextFile(migrationPath);
    
    console.log(`⚙️  Executing migration: ${migrationFile}`);
    
    // Split SQL into individual statements
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      const trimmedStatement = statement.trim();
      if (trimmedStatement) {
        // Use Supabase REST API to execute SQL
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_KEY
          },
          body: JSON.stringify({ sql: trimmedStatement })
        });
        
        if (!response.ok) {
          const error = await response.text();
          console.error(`❌ SQL execution failed:`, trimmedStatement.substring(0, 100) + '...');
          console.error('Response:', error);
          return false;
        }
      }
    }
    
    console.log(`✅ Migration completed: ${migrationFile}`);
    return true;
  } catch (err) {
    console.error(`❌ Failed to read or execute migration: ${migrationFile}`);
    console.error('Error:', err);
    return false;
  }
}

async function setupDatabase() {
  const migrations = [
    '01_initial_schema.sql'
  ];
  
  console.log(`📊 Found ${migrations.length} migration(s) to run`);
  
  for (const migration of migrations) {
    const success = await runMigration(migration);
    if (!success) {
      console.error(`❌ Database setup failed at migration: ${migration}`);
      Deno.exit(1);
    }
  }
  
  console.log('🎉 Database setup completed successfully!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Run: deno task dev (in /api directory)');
  console.log('2. Test: curl http://localhost:8000/health');
  console.log('3. Create your first knowledge entry via the API');
}

// Check if we can connect to Supabase
console.log('🔗 Testing connection to Supabase...');
try {
  const { data, error } = await supabase.from('auth.users').select('count').limit(1);
  if (error && !error.message.includes('permission denied')) {
    throw error;
  }
  console.log('✅ Supabase connection successful');
} catch (err) {
  console.error('❌ Failed to connect to Supabase');
  console.error('Error:', err);
  console.error('');
  console.error('Make sure your SUPABASE_PROJECT_URL and SUPABASE_SERVICE_KEY are correct');
  Deno.exit(1);
}

await setupDatabase();