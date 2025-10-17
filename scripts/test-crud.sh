#!/bin/bash

set -e

BASE_URL="http://localhost:8000/api"
KNOWLEDGE_ID=""

echo "🧪 Testing Knowledger CRUD Operations"
echo "===================================="
echo ""

# Test 1: Create a knowledge entry
echo "📝 Test 1: Creating knowledge entry..."
RESPONSE=$(curl -s -X POST "$BASE_URL/knowledge" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Knowledge Entry",
    "content": "This is a test entry created via API to verify CRUD operations work correctly.",
    "tags": ["test", "api", "crud"],
    "metadata": {"source": "test-script"}
  }')

echo "Response: $RESPONSE"

# Extract ID from response (basic parsing)
KNOWLEDGE_ID=$(echo $RESPONSE | grep -o '"id":"[^"]*"' | sed 's/"id":"\([^"]*\)"/\1/')

if [ -n "$KNOWLEDGE_ID" ]; then
  echo "✅ Created knowledge entry with ID: $KNOWLEDGE_ID"
else
  echo "❌ Failed to create knowledge entry"
  exit 1
fi

echo ""

# Test 2: List knowledge entries
echo "📋 Test 2: Listing knowledge entries..."
LIST_RESPONSE=$(curl -s "$BASE_URL/knowledge")
echo "Response: $LIST_RESPONSE"
echo "✅ List operation completed"
echo ""

# Test 3: Get specific knowledge entry
echo "🔍 Test 3: Getting specific knowledge entry..."
GET_RESPONSE=$(curl -s "$BASE_URL/knowledge/$KNOWLEDGE_ID")
echo "Response: $GET_RESPONSE"
echo "✅ Get operation completed"
echo ""

# Test 4: Update knowledge entry
echo "✏️  Test 4: Updating knowledge entry..."
UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/knowledge/$KNOWLEDGE_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Test Knowledge Entry",
    "content": "This content has been updated via API.",
    "tags": ["test", "api", "crud", "updated"]
  }')
echo "Response: $UPDATE_RESPONSE"
echo "✅ Update operation completed"
echo ""

# Test 5: Search knowledge entries
echo "🔎 Test 5: Searching knowledge entries..."
SEARCH_RESPONSE=$(curl -s "$BASE_URL/search?q=updated&tags=test")
echo "Response: $SEARCH_RESPONSE"
echo "✅ Search operation completed"
echo ""

# Test 6: Delete knowledge entry
echo "🗑️  Test 6: Deleting knowledge entry..."
DELETE_RESPONSE=$(curl -s -X DELETE "$BASE_URL/knowledge/$KNOWLEDGE_ID")
echo "Response: $DELETE_RESPONSE"
echo "✅ Delete operation completed"
echo ""

# Test 7: Verify deletion
echo "🔍 Test 7: Verifying deletion..."
VERIFY_RESPONSE=$(curl -s "$BASE_URL/knowledge/$KNOWLEDGE_ID")
echo "Response: $VERIFY_RESPONSE"
echo "✅ Verification completed"
echo ""

echo "🎉 All CRUD tests completed!"
echo "Remember to check the API server logs for any errors."