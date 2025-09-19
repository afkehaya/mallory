#!/bin/bash

# E2E Amazon Purchase Test Script
# Tests the complete flow: health checks → search → purchase with x402 payment

set -e

echo "🧪 Starting E2E Amazon Purchase Test"
echo "==============================================="

# Configuration
AMAZON_PROXY_URL="http://localhost:8787"
PAYMENT_PROXY_URL="http://localhost:8402"
MALLORY_APP_URL="http://localhost:3001"
TMP_DIR="/tmp/mallory-e2e"
SEARCH_QUERY="AirPods under \$200"

# Create temp directory
mkdir -p "$TMP_DIR"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

function log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

function log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

function log_error() {
    echo -e "${RED}❌ $1${NC}"
}

function log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

function check_service() {
    local name=$1
    local url=$2

    log_info "Checking $name at $url"

    if curl -s -f "$url" > /dev/null; then
        log_success "$name is running"
        return 0
    else
        log_error "$name is not responding at $url"
        return 1
    fi
}

function test_search() {
    log_info "Testing Amazon product search for: $SEARCH_QUERY"

    local search_response=$(curl -s -w "HTTP_STATUS:%{http_code}" \
        -H "Content-Type: application/json" \
        "$AMAZON_PROXY_URL/products?search=$(echo "$SEARCH_QUERY" | sed 's/ /%20/g')")

    local http_status=$(echo "$search_response" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
    local response_body=$(echo "$search_response" | sed 's/HTTP_STATUS:[0-9]*$//')

    if [ "$http_status" -eq 200 ]; then
        log_success "Search request successful"

        # Extract first product ASIN/SKU
        local asin=$(echo "$response_body" | grep -o '"asin":"[^"]*"' | head -1 | cut -d'"' -f4)

        if [ -n "$asin" ]; then
            echo "$asin" > "$TMP_DIR/asin.txt"
            log_success "Found product ASIN: $asin"

            # Save full product details for reference
            echo "$response_body" | jq '.products[0]' > "$TMP_DIR/product.json" 2>/dev/null || echo "$response_body" > "$TMP_DIR/search_response.txt"

            return 0
        else
            log_error "No ASIN found in search response"
            echo "$response_body" > "$TMP_DIR/search_error.txt"
            return 1
        fi
    else
        log_error "Search failed with HTTP status: $http_status"
        echo "$response_body" > "$TMP_DIR/search_error.txt"
        return 1
    fi
}

function test_purchase() {
    local asin=$(cat "$TMP_DIR/asin.txt")
    log_info "Testing purchase for ASIN: $asin"

    # Create purchase request payload
    local purchase_payload=$(cat <<EOF
{
    "sku": "$asin",
    "quantity": 1,
    "shipping": {
        "name": "E2E Test Customer",
        "email": "test@example.com",
        "address": {
            "line1": "123 Test Street",
            "city": "San Francisco",
            "state": "CA",
            "postalCode": "94105",
            "country": "US"
        }
    }
}
EOF
)

    log_info "Sending purchase request to Amazon proxy..."

    local purchase_response=$(curl -s -w "HTTP_STATUS:%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -d "$purchase_payload" \
        "$AMAZON_PROXY_URL/purchase")

    local http_status=$(echo "$purchase_response" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
    local response_body=$(echo "$purchase_response" | sed 's/HTTP_STATUS:[0-9]*$//')

    echo "$response_body" > "$TMP_DIR/purchase_response.txt"

    if [ "$http_status" -eq 200 ]; then
        log_success "Purchase request successful (HTTP $http_status)"

        # Check for orderId in response
        local order_id=$(echo "$response_body" | grep -o '"orderId":"[^"]*"' | cut -d'"' -f4)

        if [ -n "$order_id" ]; then
            log_success "✨ ORDER CREATED: $order_id"
            echo "$order_id" > "$TMP_DIR/order_id.txt"

            # Pretty print the response if jq is available
            if command -v jq &> /dev/null; then
                echo "$response_body" | jq '.' > "$TMP_DIR/purchase_response.json"
                log_info "Purchase response saved to $TMP_DIR/purchase_response.json"
            fi

            return 0
        else
            log_error "Purchase response missing orderId!"
            log_warning "Response: $response_body"
            return 1
        fi
    else
        log_error "Purchase failed with HTTP status: $http_status"
        log_warning "Response: $response_body"
        return 1
    fi
}

# Main execution
echo "🏁 Starting health checks..."

# Check all services
if ! check_service "Amazon Proxy" "$AMAZON_PROXY_URL/health"; then
    log_error "Amazon proxy health check failed. Make sure it's running on port 8787"
    exit 1
fi

if ! check_service "Payment Proxy" "$PAYMENT_PROXY_URL/health"; then
    log_warning "Payment proxy health check failed, but continuing..."
fi

if ! check_service "Mallory App" "$MALLORY_APP_URL/api/health"; then
    log_warning "Mallory app health check failed, but continuing..."
fi

echo ""
echo "🔍 Testing product search..."

if ! test_search; then
    log_error "Search test failed. Check logs in $TMP_DIR/"
    exit 1
fi

echo ""
echo "💳 Testing purchase..."

if ! test_purchase; then
    log_error "Purchase test failed. Check logs in $TMP_DIR/"
    exit 1
fi

echo ""
echo "🎉 E2E Test PASSED!"
echo "==============================================="
log_success "All tests completed successfully"

if [ -f "$TMP_DIR/order_id.txt" ]; then
    local order_id=$(cat "$TMP_DIR/order_id.txt")
    log_success "Final Order ID: $order_id"
fi

log_info "Test artifacts saved in: $TMP_DIR/"
echo ""

exit 0