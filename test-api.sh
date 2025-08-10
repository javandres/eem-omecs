#!/bin/bash

# Test API endpoints from command line
# Make sure your Next.js app is running first!

BASE_URL="http://localhost:3000"

echo "🧪 Testing API endpoints..."
echo "=========================="

# Test CSV Data endpoint
echo -e "\n📊 Testing CSV Data endpoint..."
curl -s "$BASE_URL/api/csv-data" | jq '.[0:3]' 2>/dev/null || curl -s "$BASE_URL/api/csv-data" | head -20

# Test KoboToolBox Form endpoint
echo -e "\n🔗 Testing KoboToolBox Form endpoint..."
curl -s "$BASE_URL/api/koboToolBox?action=form" | jq '.' 2>/dev/null || curl -s "$BASE_URL/api/koboToolBox?action=form"

# Test KoboToolBox Submissions endpoint
echo -e "\n📝 Testing KoboToolBox Submissions endpoint..."
curl -s "$BASE_URL/api/koboToolBox?action=submissions&page=1&pageSize=3" | jq '.' 2>/dev/null || curl -s "$BASE_URL/api/koboToolBox?action=submissions&page=1&pageSize=3"

# Test Mock Data
echo -e "\n🎭 Testing Mock Data..."
curl -s "$BASE_URL/api/koboToolBox?action=submissions&mock=true" | jq '.' 2>/dev/null || curl -s "$BASE_URL/api/koboToolBox?action=submissions&mock=true"

echo -e "\n✅ API testing completed!"
echo "For more detailed testing, visit: $BASE_URL/test-api"
