#!/bin/bash

set -e  # Exit on any error

echo "🚀 Knowledger Database Setup (Simple)"
echo "======================================"
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found!"
    echo "📋 Create .env file with required variables"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

if [ -z "$SUPABASE_PROJECT_URL" ] || [ -z "$SUPABASE_KEY" ]; then
    echo "❌ Missing required environment variables in .env:"
    echo "   - SUPABASE_PROJECT_URL"
    echo "   - SUPABASE_KEY" 
    exit 1
fi

echo "📍 Supabase URL: $SUPABASE_PROJECT_URL"
echo "🔗 Testing connection..."

# Test connection
response=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "apikey: $SUPABASE_KEY" \
    "$SUPABASE_PROJECT_URL/rest/v1/")

if [ "$response" != "200" ]; then
    echo "❌ Failed to connect to Supabase (HTTP $response)"
    echo "🔍 Check your SUPABASE_PROJECT_URL and SUPABASE_KEY"
    exit 1
fi

echo "✅ Connection successful!"
echo ""

# Read the SQL file
if [ ! -f "db/01_initial_schema.sql" ]; then
    echo "❌ Migration file not found: db/01_initial_schema.sql"
    exit 1
fi

echo "📊 Applying database migration..."
echo "⚠️  Note: This will create tables and RLS policies"

# For now, we'll provide instructions for manual execution
echo ""
echo "🔧 Please execute the following steps manually:"
echo ""
echo "1. Open your Supabase dashboard: https://supabase.com/dashboard/project/$(basename $SUPABASE_PROJECT_URL .supabase.co)"
echo "2. Go to 'SQL Editor'"
echo "3. Copy and paste the contents of: db/01_initial_schema.sql"
echo "4. Click 'Run' to execute"
echo ""
echo "📄 You can view the SQL file with:"
echo "   cat db/01_initial_schema.sql"
echo ""

# Show first few lines of the SQL
echo "📋 Migration preview (first 10 lines):"
echo "----------------------------------------"
head -10 db/01_initial_schema.sql
echo "... (and more)"
echo ""

echo "🎯 After manual execution, verify with:"
echo "   1. Check Table Editor for new tables"
echo "   2. Run: cd api && deno task dev"
echo "   3. Test: curl http://localhost:8000/health"