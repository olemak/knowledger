#!/bin/bash

set -e  # Exit on any error

echo "🚀 Knowledger Database Setup (Automated)"
echo "========================================="
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found!"
    echo "📥 Install it with: npm install -g supabase"
    echo "📚 Or visit: https://supabase.com/docs/guides/cli"
    echo ""
    echo "💡 Alternatively, run: ./scripts/setup-db-manual.sh for manual setup"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found!"
    echo "📋 Create .env file with:"
    echo "   SUPABASE_PROJECT_URL=your-url"
    echo "   SUPABASE_KEY=your-key"
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

# Link to Supabase project (temporary for migration)
PROJECT_ID=$(echo $SUPABASE_PROJECT_URL | sed 's|https://||' | sed 's|\.supabase\.co||')
echo "🔗 Project ID: $PROJECT_ID"

# First, we need to link to the project
echo "🔗 Linking to Supabase project..."
echo "$SUPABASE_KEY" | supabase auth login --token

# Run the migration using the new CLI
echo "📊 Applying database migration..."
supabase db push --linked --include-all

if [ $? -eq 0 ]; then
    echo "🎉 Database setup completed successfully!"
    echo ""
    echo "🔍 Verification:"
    echo "   - Check your Supabase dashboard > Table Editor"
    echo "   - Tables should now exist: users, workspaces, projects, knowledge, etc."
    echo ""
    echo "📋 Next steps:"
    echo "   1. cd api"
    echo "   2. deno task dev"
    echo "   3. curl http://localhost:8000/health"
else
    echo "❌ Database setup failed!"
    echo "💡 Try manual setup: ./scripts/setup-db-manual.sh"
    exit 1
fi