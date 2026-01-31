#!/bin/bash

# ConsentVault DPI - Seed Data Script
# Seeds trusted domains and creates sample API keys

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
PUBLIC_DB_HOST="${PUBLIC_DB_HOST:-localhost}"
PUBLIC_DB_PORT="${PUBLIC_DB_PORT:-5432}"
PUBLIC_DB_USER="${PUBLIC_DB_USER:-postgres}"
PUBLIC_DB_NAME="${PUBLIC_DB_NAME:-consentvault}"
BASE_URL="${BASE_URL:-http://localhost:8000}"
ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-change-this-password}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}ConsentVault DPI - Seed Data Script${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Check if PostgreSQL client is available
if ! command -v psql &> /dev/null; then
    echo -e "${RED}Error: psql (PostgreSQL client) is not installed.${NC}"
    echo -e "${YELLOW}For Docker-based setup, use:${NC}"
    echo -e "  docker-compose exec timescaledb psql -U postgres -d consentvault"
    exit 1
fi

# Function to execute SQL
exec_sql() {
    local sql="$1"
    PGPASSWORD="${PUBLIC_DB_PASSWORD:-postgres}" psql -h "$PUBLIC_DB_HOST" -p "$PUBLIC_DB_PORT" \
        -U "$PUBLIC_DB_USER" -d "$PUBLIC_DB_NAME" -c "$sql" 2>&1
}

# Function to execute SQL via Docker (fallback)
exec_sql_docker() {
    local sql="$1"
    docker-compose exec -T timescaledb psql -U postgres -d consentvault -c "$sql" 2>&1
}

# Seed Trusted Domains
echo -e "${YELLOW}[1/3] Seeding trusted domains...${NC}"

DOMAINS=(
    "healthcare.gov.in"
    "banking.gov.in"
    "education.gov.in"
    "digilocker.gov.in"
    "uidai.gov.in"
)

for domain in "${DOMAINS[@]}"; do
    SQL="INSERT INTO trusted_domains (domain) VALUES ('$domain') ON CONFLICT DO NOTHING;"
    
    # Try direct psql first
    if command -v psql &> /dev/null && [ -z "$USE_DOCKER" ]; then
        RESULT=$(exec_sql "$SQL" 2>&1)
    else
        # Fallback to Docker
        RESULT=$(exec_sql_docker "$SQL" 2>&1)
    fi
    
    if echo "$RESULT" | grep -q "ERROR"; then
        echo -e "${RED}  ✗ Failed to add $domain${NC}"
        echo -e "${RED}    $RESULT${NC}"
    else
        echo -e "${GREEN}  ✓ Added trusted domain: $domain${NC}"
    fi
done

echo ""

# Verify trusted domains
echo -e "${YELLOW}[2/3] Verifying trusted domains...${NC}"
if command -v psql &> /dev/null && [ -z "$USE_DOCKER" ]; then
    DOMAIN_COUNT=$(exec_sql "SELECT COUNT(*) FROM trusted_domains;" | grep -E '^\s*[0-9]+' | xargs)
else
    DOMAIN_COUNT=$(exec_sql_docker "SELECT COUNT(*) FROM trusted_domains;" | grep -E '^\s*[0-9]+' | xargs)
fi

echo -e "${GREEN}  Total trusted domains: $DOMAIN_COUNT${NC}\n"

# Create Sample API Keys (requires FastAPI server running)
echo -e "${YELLOW}[3/3] Creating sample API keys...${NC}"

# Check if API is reachable
if ! curl -s "$BASE_URL/health" > /dev/null 2>&1; then
    echo -e "${RED}  ✗ FastAPI server not reachable at $BASE_URL${NC}"
    echo -e "${YELLOW}  Skipping API key creation. Start the server and run this script again.${NC}"
    exit 0
fi

# Login as admin
echo -e "${BLUE}  → Logging in as admin...${NC}"
ADMIN_LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/admin/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$ADMIN_USERNAME\",\"password\":\"$ADMIN_PASSWORD\"}")

if ! echo "$ADMIN_LOGIN_RESPONSE" | grep -q '"access_token"'; then
    echo -e "${RED}  ✗ Admin login failed${NC}"
    echo -e "${RED}    Response: $ADMIN_LOGIN_RESPONSE${NC}"
    exit 1
fi

ADMIN_TOKEN=$(echo "$ADMIN_LOGIN_RESPONSE" | jq -r '.access_token')
echo -e "${GREEN}  ✓ Admin login successful${NC}"

# Create API keys
API_KEYS=(
    "Healthcare API:healthcare.gov.in"
    "Banking API:banking.gov.in"
    "Education API:education.gov.in"
)

echo -e "${BLUE}  → Creating API keys...${NC}\n"

for entry in "${API_KEYS[@]}"; do
    IFS=':' read -r name domain <<< "$entry"
    
    API_KEY_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/admin/api-keys" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -d "{\"name\":\"$name\",\"domain\":\"$domain\"}")
    
    if echo "$API_KEY_RESPONSE" | grep -q '"full_key"'; then
        FULL_KEY=$(echo "$API_KEY_RESPONSE" | jq -r '.full_key')
        KEY_ID=$(echo "$API_KEY_RESPONSE" | jq -r '.key_id')
        echo -e "${GREEN}  ✓ Created API key for $domain${NC}"
        echo -e "    Key ID:   $KEY_ID"
        echo -e "    Full Key: ${YELLOW}$FULL_KEY${NC}"
        echo -e "    ${RED}⚠ Store this key securely - it won't be shown again!${NC}\n"
    else
        echo -e "${RED}  ✗ Failed to create API key for $domain${NC}"
        echo -e "${RED}    Response: $API_KEY_RESPONSE${NC}\n"
    fi
done

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ Seeding completed successfully!${NC}"
echo -e "${BLUE}========================================${NC}\n"

echo -e "Next steps:"
echo -e "1. ${YELLOW}Test the API:${NC} bash scripts/qa-tests.sh"
echo -e "2. ${YELLOW}View trusted domains:${NC}"
if command -v psql &> /dev/null && [ -z "$USE_DOCKER" ]; then
    echo -e "   psql -h $PUBLIC_DB_HOST -p $PUBLIC_DB_PORT -U $PUBLIC_DB_USER -d $PUBLIC_DB_NAME -c 'SELECT * FROM trusted_domains;'"
else
    echo -e "   docker-compose exec timescaledb psql -U postgres -d consentvault -c 'SELECT * FROM trusted_domains;'"
fi
echo -e "3. ${YELLOW}View API keys:${NC} curl -H \"Authorization: Bearer <admin_token>\" $BASE_URL/api/v1/admin/api-keys\n"

exit 0
