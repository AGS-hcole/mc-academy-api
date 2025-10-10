#!/bin/bash

# Reporting Endpoints - Testing Script
# This script demonstrates how to test the reporting endpoints

# Configuration
BASE_URL="http://localhost:3000/api"
JWT_TOKEN="${JWT_TOKEN:-your_jwt_token_here}"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Reporting Endpoints Test Script ===${NC}\n"

if [ "$JWT_TOKEN" = "your_jwt_token_here" ]; then
    echo "⚠️  Please set JWT_TOKEN environment variable with a valid admin token"
    echo "   Example: export JWT_TOKEN='your_actual_token'"
    echo ""
fi

# Test 1: Summary Endpoint
echo -e "${GREEN}1. Testing Summary Endpoint${NC}"
echo "GET $BASE_URL/reports/sessions/summary?from=2024-01-01T00:00:00Z&to=2024-12-31T23:59:59Z"
echo ""
curl -s -X GET "$BASE_URL/reports/sessions/summary?from=2024-01-01T00:00:00Z&to=2024-12-31T23:59:59Z" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" | jq '.' 2>/dev/null || echo "Failed to connect or parse response"
echo ""
echo "---"
echo ""

# Test 2: Timeseries Endpoint
echo -e "${GREEN}2. Testing Timeseries Endpoint${NC}"
echo "GET $BASE_URL/reports/sessions/timeseries?from=2024-01-01T00:00:00Z&to=2024-01-31T23:59:59Z&bucket=daily"
echo ""
curl -s -X GET "$BASE_URL/reports/sessions/timeseries?from=2024-01-01T00:00:00Z&to=2024-01-31T23:59:59Z&bucket=daily" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" | jq '.' 2>/dev/null || echo "Failed to connect or parse response"
echo ""
echo "---"
echo ""

# Test 3: List Endpoint
echo -e "${GREEN}3. Testing List Endpoint${NC}"
echo "GET $BASE_URL/reports/sessions/list?from=2024-01-01T00:00:00Z&to=2024-12-31T23:59:59Z&page=1&pageSize=5"
echo ""
curl -s -X GET "$BASE_URL/reports/sessions/list?from=2024-01-01T00:00:00Z&to=2024-12-31T23:59:59Z&page=1&pageSize=5" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" | jq '.' 2>/dev/null || echo "Failed to connect or parse response"
echo ""
echo "---"
echo ""

# Test 4: User Lookup Endpoint
echo -e "${GREEN}4. Testing User Lookup Endpoint${NC}"
echo "GET $BASE_URL/users/lookup?role=user&page=1&pageSize=5"
echo ""
curl -s -X GET "$BASE_URL/users/lookup?role=user&page=1&pageSize=5" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" | jq '.' 2>/dev/null || echo "Failed to connect or parse response"
echo ""
echo "---"
echo ""

# Test 5: Summary with Contract Scope
echo -e "${GREEN}5. Testing Summary with Contract Scope (under)${NC}"
echo "GET $BASE_URL/reports/sessions/summary?from=2024-01-01T00:00:00Z&to=2024-12-31T23:59:59Z&contractScope=under"
echo ""
curl -s -X GET "$BASE_URL/reports/sessions/summary?from=2024-01-01T00:00:00Z&to=2024-12-31T23:59:59Z&contractScope=under" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" | jq '.' 2>/dev/null || echo "Failed to connect or parse response"
echo ""

echo -e "${BLUE}=== Test Complete ===${NC}"
