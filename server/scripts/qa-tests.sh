#!/bin/bash

# ConsentVault DPI - QA Test Suite
# Tests all API endpoints with colored output

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost:8000}"
ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-change-this-password}"

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Helper functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_test() {
    echo -e "${YELLOW}[TEST]${NC} $1"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

print_pass() {
    echo -e "${GREEN}[PASS]${NC} $1\n"
    PASSED_TESTS=$((PASSED_TESTS + 1))
}

print_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    echo -e "${RED}Response:${NC} $2\n"
    FAILED_TESTS=$((FAILED_TESTS + 1))
}

check_response() {
    local response="$1"
    local expected_pattern="$2"
    local test_name="$3"
    
    if echo "$response" | grep -q "$expected_pattern"; then
        print_pass "$test_name"
        return 0
    else
        print_fail "$test_name" "$response"
        return 1
    fi
}

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq is not installed. Please install it first.${NC}"
    exit 1
fi

# Main test execution
print_header "ConsentVault DPI - QA Test Suite"

echo "Testing API at: $BASE_URL"
echo "Admin username: $ADMIN_USERNAME"
echo ""

# Test 1: Health Check
print_header "Test 1: Health Check"
print_test "GET /health"
HEALTH_RESPONSE=$(curl -s "$BASE_URL/health")
check_response "$HEALTH_RESPONSE" '"status":"healthy"' "Health endpoint returns healthy status"
check_response "$HEALTH_RESPONSE" '"public":"connected"' "Public database is connected"
check_response "$HEALTH_RESPONSE" '"private":"connected"' "Private database is connected"
check_response "$HEALTH_RESPONSE" '"redis":"connected"' "Redis is connected"

# Test 2: Admin Login
print_header "Test 2: Admin Authentication"
print_test "POST /api/v1/admin/login"
ADMIN_LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/admin/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$ADMIN_USERNAME\",\"password\":\"$ADMIN_PASSWORD\"}")

if check_response "$ADMIN_LOGIN_RESPONSE" '"access_token"' "Admin login successful"; then
    ADMIN_TOKEN=$(echo "$ADMIN_LOGIN_RESPONSE" | jq -r '.access_token')
    echo "Admin token: ${ADMIN_TOKEN:0:50}..."
else
    echo -e "${RED}Admin login failed. Cannot proceed with admin tests.${NC}"
    ADMIN_TOKEN=""
fi

# Test 3: Create API Key (Admin)
if [ -n "$ADMIN_TOKEN" ]; then
    print_header "Test 3: API Key Management"
    print_test "POST /api/v1/admin/api-keys"
    API_KEY_CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/admin/api-keys" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -d '{"name":"QA Test Key","domain":"qa-test.example.com"}')
    
    if check_response "$API_KEY_CREATE_RESPONSE" '"full_key"' "API key created with full_key"; then
        API_KEY_ID=$(echo "$API_KEY_CREATE_RESPONSE" | jq -r '.key_id')
        echo "Created API key ID: $API_KEY_ID"
    else
        API_KEY_ID=""
    fi
    
    # Test 4: List API Keys
    print_test "GET /api/v1/admin/api-keys"
    API_KEY_LIST_RESPONSE=$(curl -s -X GET "$BASE_URL/api/v1/admin/api-keys" \
        -H "Authorization: Bearer $ADMIN_TOKEN")
    check_response "$API_KEY_LIST_RESPONSE" '"api_keys"' "API keys listed successfully"
    check_response "$API_KEY_LIST_RESPONSE" '"key_prefix"' "API key prefixes shown (not full keys)"
    
    # Test 5: Revoke API Key
    if [ -n "$API_KEY_ID" ]; then
        print_test "DELETE /api/v1/admin/api-keys/$API_KEY_ID"
        API_KEY_REVOKE_RESPONSE=$(curl -s -X DELETE "$BASE_URL/api/v1/admin/api-keys/$API_KEY_ID" \
            -H "Authorization: Bearer $ADMIN_TOKEN")
        check_response "$API_KEY_REVOKE_RESPONSE" '"revoked":true' "API key revoked successfully"
    fi
fi

# Test 6: Onboard User
print_header "Test 4: Proof Onboarding"
print_test "POST /api/v1/onboard"
ONBOARD_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/onboard" \
    -H "Content-Type: application/json" \
    -d '{
        "doc_data": "test_document_data_base64",
        "doc_type": "aadhaar",
        "proof": {
            "pi_a": ["1", "2"],
            "pi_b": [["3", "4"], ["5", "6"]],
            "pi_c": ["7", "8"],
            "protocol": "groth16"
        },
        "pub_signals": ["signal1", "signal2"]
    }')

if check_response "$ONBOARD_RESPONSE" '"access_token"' "User onboarding successful"; then
    USER_TOKEN=$(echo "$ONBOARD_RESPONSE" | jq -r '.access_token')
    echo "User token: ${USER_TOKEN:0:50}..."
else
    echo -e "${RED}Onboarding failed. Cannot proceed with user tests.${NC}"
    USER_TOKEN=""
fi

# Test 7: Verify Proof
if [ -n "$USER_TOKEN" ]; then
    print_header "Test 5: Proof Verification"
    print_test "GET /api/v1/verify?token=$USER_TOKEN"
    VERIFY_RESPONSE=$(curl -s "$BASE_URL/api/v1/verify?token=$USER_TOKEN")
    
    if check_response "$VERIFY_RESPONSE" '"valid":true' "Proof verification successful"; then
        PROOF_ID=$(echo "$VERIFY_RESPONSE" | jq -r '.attributes.proof_id // empty')
        USER_ID=$(echo "$VERIFY_RESPONSE" | jq -r '.attributes.user_id // empty')
        check_response "$VERIFY_RESPONSE" '"doc_type":"aadhaar"' "Proof attributes include doc_type"
        check_response "$VERIFY_RESPONSE" '"expiry"' "Proof attributes include expiry"
        echo "Proof ID: $PROOF_ID"
        echo "User ID: $USER_ID"
    else
        PROOF_ID=""
        USER_ID=""
    fi
    
    # Test 8: Dashboard
    print_header "Test 6: User Dashboard"
    print_test "GET /api/v1/dashboard"
    DASHBOARD_RESPONSE=$(curl -s "$BASE_URL/api/v1/dashboard" \
        -H "Authorization: Bearer $USER_TOKEN")
    check_response "$DASHBOARD_RESPONSE" '"proofs"' "Dashboard returns proofs list"
    check_response "$DASHBOARD_RESPONSE" '"logs"' "Dashboard returns logs list"
    
    # Test 9: Handover (will fail without trusted domain)
    print_header "Test 7: Handover (Expected to Fail Without Trusted Domain)"
    print_test "POST /api/v1/handover"
    
    # First, we need to decode the JWT to get proof_id
    # For testing purposes, we'll extract it from verify response
    if [ -n "$PROOF_ID" ]; then
        HANDOVER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/handover" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $USER_TOKEN" \
            -d "{
                \"proof_id\": \"$PROOF_ID\",
                \"consent_token\": \"test_consent_token\",
                \"requesting_domain\": \"healthcare.gov.in\"
            }")
        
        # This should fail because healthcare.gov.in is not in trusted_domains yet
        if echo "$HANDOVER_RESPONSE" | grep -q "not trusted"; then
            print_pass "Handover correctly rejects untrusted domain"
        elif echo "$HANDOVER_RESPONSE" | grep -q "presigned_url"; then
            print_pass "Handover successful (domain was trusted)"
        else
            print_fail "Handover response unexpected" "$HANDOVER_RESPONSE"
        fi
    else
        echo -e "${YELLOW}[SKIP]${NC} Handover test skipped (no proof_id available)\n"
    fi
    
    # Test 10: Revoke Proof
    print_header "Test 8: Proof Revocation"
    if [ -n "$PROOF_ID" ]; then
        print_test "POST /api/v1/revoke?proof_id=$PROOF_ID"
        REVOKE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/revoke?proof_id=$PROOF_ID" \
            -H "Authorization: Bearer $USER_TOKEN")
        check_response "$REVOKE_RESPONSE" '"revoked":true' "Proof revoked successfully"
        
        # Test 11: Verify Revoked Proof
        print_test "GET /api/v1/verify?token=$USER_TOKEN (after revocation)"
        VERIFY_REVOKED_RESPONSE=$(curl -s "$BASE_URL/api/v1/verify?token=$USER_TOKEN")
        check_response "$VERIFY_REVOKED_RESPONSE" '"valid":false' "Revoked proof fails verification"
        check_response "$VERIFY_REVOKED_RESPONSE" '"reason"' "Verification includes failure reason"
    else
        echo -e "${YELLOW}[SKIP]${NC} Revocation test skipped (no proof_id available)\n"
    fi
fi

# Test 12: Invalid Token
print_header "Test 9: Security Validations"
print_test "GET /api/v1/verify?token=invalid_token"
INVALID_TOKEN_RESPONSE=$(curl -s "$BASE_URL/api/v1/verify?token=invalid_token")
check_response "$INVALID_TOKEN_RESPONSE" '"valid":false' "Invalid token rejected"

# Test 13: Unauthorized Dashboard Access
print_test "GET /api/v1/dashboard (without auth)"
UNAUTH_DASHBOARD_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/dashboard")
if echo "$UNAUTH_DASHBOARD_RESPONSE" | tail -n1 | grep -q "401\|403"; then
    print_pass "Unauthorized dashboard access blocked"
else
    print_fail "Unauthorized dashboard access should be blocked" "$UNAUTH_DASHBOARD_RESPONSE"
fi

# Test 14: Invalid Admin Login
print_test "POST /api/v1/admin/login (invalid credentials)"
INVALID_ADMIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/admin/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"invalid","password":"invalid"}')
if echo "$INVALID_ADMIN_RESPONSE" | grep -q "401"; then
    print_pass "Invalid admin credentials rejected"
elif ! echo "$INVALID_ADMIN_RESPONSE" | grep -q '"access_token"'; then
    print_pass "Invalid admin credentials rejected"
else
    print_fail "Invalid admin credentials should be rejected" "$INVALID_ADMIN_RESPONSE"
fi

# Summary
print_header "Test Summary"
echo -e "Total tests:  ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Passed:       ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed:       ${RED}$FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}All tests passed! ✓${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Please review the output above.${NC}"
    exit 1
fi
