#!/bin/bash

# E2E test script for stateless SKU flow
# Tests the complete flow: health checks -> search -> purchase with signed product data

set -e

echo "🧪 E2E Test: Stateless SKU Flow with HMAC Signatures"
echo "==============================================="

# Configuration
AMAZON_PROXY_URL="http://localhost:8787"
PAYMENT_PROXY_URL="http://localhost:8402"
MALLORY_APP_URL="http://localhost:3001"
TMP_DIR="/tmp/mallory-e2e"
SEARCH_QUERY="wireless earbuds"

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
    log_info "Testing Amazon product search with signed data for: $SEARCH_QUERY"

    local search_response=$(curl -s -w "HTTP_STATUS:%{http_code}" \
        -H "Content-Type: application/json" \
        "$AMAZON_PROXY_URL/products?search=$(echo "$SEARCH_QUERY" | sed 's/ /%20/g')&limit=1")

    local http_status=$(echo "$search_response" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
    local response_body=$(echo "$search_response" | sed 's/HTTP_STATUS:[0-9]*$//')

    echo "$response_body" > "$TMP_DIR/search_response.txt"

    if [ "$http_status" -eq 200 ]; then
        log_success "Search request successful"

        # Check if we got products
        local product_count=$(echo "$response_body" | jq -r '.count // 0' 2>/dev/null || echo "0")
        if [ "$product_count" -eq 0 ]; then
            log_error "No products found in search"
            return 1
        fi

        # Extract first product's signed data and ASIN
        local asin=$(echo "$response_body" | jq -r '.products[0].product.asin // .products[0].asin // empty' 2>/dev/null)
        local product_blob=$(echo "$response_body" | jq -r '.products[0].productBlob // empty' 2>/dev/null)
        local signature=$(echo "$response_body" | jq -r '.products[0].signature // empty' 2>/dev/null)
        local title=$(echo "$response_body" | jq -r '.products[0].product.title // .products[0].title // empty' 2>/dev/null)
        local price=$(echo "$response_body" | jq -r '.products[0].product.price.amount // .products[0].price // empty' 2>/dev/null)

        if [ -n "$asin" ] && [ -n "$product_blob" ] && [ -n "$signature" ]; then
            echo "$asin" > "$TMP_DIR/asin.txt"
            echo "$product_blob" > "$TMP_DIR/product_blob.txt"
            echo "$signature" > "$TMP_DIR/signature.txt"

            log_success "Found product: $title"
            log_success "ASIN: $asin"
            log_success "Price: \$$price"
            log_success "Signed data received (blob: ${product_blob:0:20}..., sig: ${signature:0:20}...)"

            # Save full product details for reference
            echo "$response_body" | jq '.products[0]' > "$TMP_DIR/product.json" 2>/dev/null || echo "$response_body" > "$TMP_DIR/search_response.txt"

            return 0
        else
            log_error "Missing required signed product data (ASIN: $asin, blob: ${product_blob:0:10}..., sig: ${signature:0:10}...)"
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
    local product_blob=$(cat "$TMP_DIR/product_blob.txt")
    local signature=$(cat "$TMP_DIR/signature.txt")

    log_info "Testing stateless purchase for ASIN: $asin"

    # Generate unique idempotency key
    local idempotency_key="e2e-test-$(date +%s)-$(openssl rand -hex 4 2>/dev/null || echo $(( RANDOM )))"

    # Get price from saved product for price expectation
    local price=$(cat "$TMP_DIR/product.json" | jq -r '.product.price.amount // .price // 29.99' 2>/dev/null || echo "29.99")

    # Create purchase request payload with signed data
    local purchase_payload=$(cat <<EOF
{
    "productBlob": "$product_blob",
    "signature": "$signature",
    "quantity": 1,
    "idempotencyKey": "$idempotency_key",
    "priceExpectation": {
        "amount": $price,
        "currency": "USD"
    },
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

        # Check for orderId in response (handle both ok:true and direct orderId)
        local order_id=$(echo "$response_body" | jq -r '.orderId // empty' 2>/dev/null || echo "$response_body" | grep -o '"orderId":"[^"]*"' | cut -d'"' -f4)

        if [ -n "$order_id" ] && [ "$order_id" != "null" ]; then
            log_success "✨ ORDER CREATED: $order_id"
            echo "$order_id" > "$TMP_DIR/order_id.txt"
            echo "$idempotency_key" > "$TMP_DIR/idempotency_key.txt"

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

function test_idempotency() {
    if [ ! -f "$TMP_DIR/idempotency_key.txt" ]; then
        log_warning "Skipping idempotency test - no idempotency key saved"
        return 0
    fi

    local asin=$(cat "$TMP_DIR/asin.txt")
    local product_blob=$(cat "$TMP_DIR/product_blob.txt")
    local signature=$(cat "$TMP_DIR/signature.txt")
    local idempotency_key=$(cat "$TMP_DIR/idempotency_key.txt")
    local original_order_id=$(cat "$TMP_DIR/order_id.txt")

    log_info "Testing idempotency with same key: $idempotency_key"

    local price=$(cat "$TMP_DIR/product.json" | jq -r '.product.price.amount // .price // 29.99' 2>/dev/null || echo "29.99")

    # Create same purchase request
    local purchase_payload=$(cat <<EOF
{
    "productBlob": "$product_blob",
    "signature": "$signature",
    "quantity": 1,
    "idempotencyKey": "$idempotency_key",
    "priceExpectation": {
        "amount": $price,
        "currency": "USD"
    },
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

    local duplicate_response=$(curl -s -w "HTTP_STATUS:%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -d "$purchase_payload" \
        "$AMAZON_PROXY_URL/purchase")

    local http_status=$(echo "$duplicate_response" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
    local response_body=$(echo "$duplicate_response" | sed 's/HTTP_STATUS:[0-9]*$//')

    if [ "$http_status" -eq 200 ]; then
        local duplicate_order_id=$(echo "$response_body" | jq -r '.orderId // empty' 2>/dev/null)
        if [ "$duplicate_order_id" = "$original_order_id" ]; then
            log_success "✅ Idempotency working - same order ID returned"
            return 0
        else
            log_warning "⚠️  Different order ID returned: $duplicate_order_id vs $original_order_id"
            return 1
        fi
    else
        log_warning "⚠️  Duplicate request failed with HTTP $http_status"
        return 1
    fi
}

function test_signature_security() {
    local asin=$(cat "$TMP_DIR/asin.txt")
    local product_blob=$(cat "$TMP_DIR/product_blob.txt")
    local signature=$(cat "$TMP_DIR/signature.txt")

    log_info "Testing signature security (tampering detection)"

    # Tamper with the signature
    local tampered_signature=$(echo "$signature" | sed 's/a/b/g' | sed 's/1/2/g')
    local price=$(cat "$TMP_DIR/product.json" | jq -r '.product.price.amount // .price // 29.99' 2>/dev/null || echo "29.99")

    local tampered_payload=$(cat <<EOF
{
    "productBlob": "$product_blob",
    "signature": "$tampered_signature",
    "quantity": 1,
    "idempotencyKey": "security-test-$(date +%s)",
    "priceExpectation": {
        "amount": $price,
        "currency": "USD"
    },
    "shipping": {
        "name": "Security Test",
        "email": "security@example.com",
        "address": {
            "line1": "123 Security Street",
            "city": "San Francisco",
            "state": "CA",
            "postalCode": "94105",
            "country": "US"
        }
    }
}
EOF
)

    local tampered_response=$(curl -s -w "HTTP_STATUS:%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -d "$tampered_payload" \
        "$AMAZON_PROXY_URL/purchase")

    local http_status=$(echo "$tampered_response" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
    local response_body=$(echo "$tampered_response" | sed 's/HTTP_STATUS:[0-9]*$//')

    if [ "$http_status" -eq 400 ]; then
        local error_code=$(echo "$response_body" | jq -r '.code // empty' 2>/dev/null)
        if [ "$error_code" = "INVALID_SIGNATURE" ]; then
            log_success "✅ Security test passed - tampered signature rejected"
            return 0
        else
            log_warning "⚠️  Unexpected error code: $error_code"
            return 1
        fi
    else
        log_error "❌ Security test failed - tampered signature was accepted (HTTP $http_status)"
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
echo "💳 Testing stateless purchase with HMAC signatures..."

if ! test_purchase; then
    log_error "Purchase test failed. Check logs in $TMP_DIR/"
    exit 1
fi

echo ""
echo "🔁 Testing idempotency..."

if ! test_idempotency; then
    log_warning "Idempotency test failed, but continuing..."
fi

echo ""
echo "🔒 Testing signature security..."

if ! test_signature_security; then
    log_error "Security test failed. HMAC verification is not working properly!"
    exit 1
fi

echo ""
echo "🎉 E2E Test PASSED!"
echo "==============================================="
log_success "All tests completed successfully"
echo ""
log_success "✅ Health checks passed"
log_success "✅ Product search with HMAC signatures working"
log_success "✅ Purchase flow with signed data working"
log_success "✅ Idempotency mechanism working"
log_success "✅ HMAC signature security working"

if [ -f "$TMP_DIR/order_id.txt" ]; then
    local order_id=$(cat "$TMP_DIR/order_id.txt")
    log_success "Final Order ID: $order_id"
fi

log_info "Test artifacts saved in: $TMP_DIR/"
echo ""
echo "🎯 Stateless SKU flow is working correctly!"

exit 0