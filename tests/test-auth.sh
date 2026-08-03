#!/bin/bash

# Test Suite: Authentication
# Tests login, token validation, and user management

set -e

BASE_URL="http://localhost:8081"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "  Authentication Tests"
echo "=========================================="
echo ""

# Test 1: Login with OWNER
echo -e "${YELLOW}Test 1: Login with OWNER (owner1@techcorp.cl)${NC}"
RESPONSE=$(curl -s -X POST ${BASE_URL}/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner1@techcorp.cl",
    "password": "Test1234!"
  }')

TOKEN=$(echo $RESPONSE | jq -r '.accessToken')
USER_ID=$(echo $RESPONSE | jq -r '.user.id')

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
    echo -e "${GREEN}✓ Login successful${NC}"
    echo "  User ID: $USER_ID"
    echo "  Token: ${TOKEN:0:20}..."
    export OWNER_TOKEN=$TOKEN
    export OWNER_ID=$USER_ID
else
    echo -e "${RED}✗ Login failed${NC}"
    echo "Response: $RESPONSE"
    exit 1
fi
echo ""

# Test 2: Login with ADMIN
echo -e "${YELLOW}Test 2: Login with ADMIN (admin1@techcorp.cl)${NC}"
RESPONSE=$(curl -s -X POST ${BASE_URL}/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin1@techcorp.cl",
    "password": "Test1234!"
  }')

TOKEN=$(echo $RESPONSE | jq -r '.accessToken')
USER_ID=$(echo $RESPONSE | jq -r '.user.id')

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
    echo -e "${GREEN}✓ Login successful${NC}"
    echo "  User ID: $USER_ID"
    export ADMIN_TOKEN=$TOKEN
    export ADMIN_ID=$USER_ID
else
    echo -e "${RED}✗ Login failed${NC}"
    exit 1
fi
echo ""

# Test 3: Login with MEMBER
echo -e "${YELLOW}Test 3: Login with MEMBER (member1@techcorp.cl)${NC}"
RESPONSE=$(curl -s -X POST ${BASE_URL}/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "member1@techcorp.cl",
    "password": "Test1234!"
  }')

TOKEN=$(echo $RESPONSE | jq -r '.accessToken')
USER_ID=$(echo $RESPONSE | jq -r '.user.id')

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
    echo -e "${GREEN}✓ Login successful${NC}"
    echo "  User ID: $USER_ID"
    export MEMBER_TOKEN=$TOKEN
    export MEMBER_ID=$USER_ID
else
    echo -e "${RED}✗ Login failed${NC}"
    exit 1
fi
echo ""

# Test 4: Validate token with /me endpoint
echo -e "${YELLOW}Test 4: Validate token with /me endpoint${NC}"
RESPONSE=$(curl -s -X GET ${BASE_URL}/api/auth/me \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "X-User-Id: $OWNER_ID")

EMAIL=$(echo $RESPONSE | jq -r '.email')

if [ "$EMAIL" == "owner1@techcorp.cl" ]; then
    echo -e "${GREEN}✓ Token validation successful${NC}"
    echo "  Email: $EMAIL"
else
    echo -e "${RED}✗ Token validation failed${NC}"
    exit 1
fi
echo ""

# Test 5: Login with invalid credentials
echo -e "${YELLOW}Test 5: Login with invalid credentials (should fail)${NC}"
RESPONSE=$(curl -s -X POST ${BASE_URL}/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid@test.com",
    "password": "WrongPassword123!"
  }')

TOKEN=$(echo $RESPONSE | jq -r '.accessToken')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
    echo -e "${GREEN}✓ Invalid login correctly rejected${NC}"
else
    echo -e "${RED}✗ Invalid login should have failed${NC}"
    exit 1
fi
echo ""

echo -e "${GREEN}=========================================="
echo "  All Authentication Tests Passed! ✓"
echo "==========================================${NC}"
echo ""

# Export tokens for other test scripts
echo "Exporting tokens to /tmp/docusing-test-tokens.env"
cat > /tmp/docusing-test-tokens.env << EOF
export OWNER_TOKEN="$OWNER_TOKEN"
export OWNER_ID="$OWNER_ID"
export ADMIN_TOKEN="$ADMIN_TOKEN"
export ADMIN_ID="$ADMIN_ID"
export MEMBER_TOKEN="$MEMBER_TOKEN"
export MEMBER_ID="$MEMBER_ID"
EOF

echo "Tokens saved. Source with: source /tmp/docusing-test-tokens.env"
