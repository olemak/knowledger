#!/bin/bash

set -e

echo "🚀 Running Knowledger database migration with Supabase CLI"
echo "=========================================================="
echo ""

# Check if .env file exists and load it
if [ ! -f ".env" ]; then
    echo "❌ .env file not found!"
    exit 1
fi

export $(cat .env | grep -v '^#' | xargs)

# Extract project reference from URL
PROJECT_REF=$(echo $SUPABASE_PROJECT_URL | sed 's|https://\([^.]*\)\.supabase\.co|\1|')
echo "📍 Project: $PROJECT_REF"

# Run the migration using Supabase CLI
echo "📊 Executing database migration..."

# Create a temporary SQL file for the CLI
cp db/01_initial_schema.sql /tmp/knowledger_migration.sql

# Use the CLI to run the SQL
SUPABASE_ACCESS_TOKEN=$SUPABASE_KEY supabase sql --project-ref $PROJECT_REF --file /tmp/knowledger_migration.sql

if [ $? -eq 0 ]; then
    echo "🎉 Database migration completed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "   1. cd api"
    echo "   2. deno task dev"
    echo "   3. curl http://localhost:8000/health"
    
    # Cleanup
    rm /tmp/knowledger_migration.sql
else
    echo "❌ Migration failed!"
    rm /tmp/knowledger_migration.sql
    exit 1
fi