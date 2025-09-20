#!/usr/bin/env bash

set -e

PAYMENT_PROXY_URL="http://localhost:8402"

echo "🧪 E2E x402 Test: First POST /purchase without payment should return 402, then succeed after payment"

# Health check payment proxy
echo "📋 Checking payment proxy health at $PAYMENT_PROXY_URL"
if ! curl -s "$PAYMENT_PROXY_URL/health" | grep -q '"status":"ok"'; then
    echo "❌ Payment proxy not healthy at $PAYMENT_PROXY_URL"
    exit 1
fi
echo "✅ Payment proxy is healthy"

# Test 1: First POST /purchase without prior payment → expect 402
echo "🔍 Test 1: POST /purchase without payment (expect 402)"

response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST \
    "$PAYMENT_PROXY_URL/purchase" \
    -H 'Content-Type: application/json' \
    -d '{
        "productBlob": "eyJ0ZXN0IjoidmFsaWQiLCJhc2luIjoiQjAxREZLQzJTTyIsInByaWNlIjp7ImFtb3VudCI6MjkuOTl9fQ",
        "signature": "test_signature",
        "quantity": 1
    }')

http_code=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
body=$(echo "$response" | sed 's/HTTPSTATUS:[0-9]*$//')

if [ "$http_code" = "402" ]; then
    echo "✅ First request correctly returned 402 (Payment Required)"
    echo "   Response: $body"
else
    echo "❌ Expected 402, got $http_code"
    echo "   Response: $body"
    exit 1
fi

# Test 2: Check that x402 headers are present in 402 response
if echo "$body" | grep -q "x402Version\|accepts"; then
    echo "✅ 402 response includes x402 challenge data"
else
    echo "❌ 402 response missing x402 challenge data"
    echo "   Response: $body"
    exit 1
fi

echo "🎉 E2E x402 test passed!"
echo "   ✓ First purchase attempt yields 402 challenge"
echo "   ✓ Error response includes proper payment required message"
echo ""
echo "Note: Full payment flow test would require wallet interaction and is handled by e2e-buy.sh"