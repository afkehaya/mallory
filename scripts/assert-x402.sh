#!/usr/bin/env bash

# Ensure direct payment proxy purchase calls use x402Fetch, not regular fetch()
# Allow calls to /api/amazon/purchase (which internally uses x402Fetch)
if git grep -nE "fetch\\(['\"].*:8402.*purchase" -- 'src/**/*.ts' 'src/**/*.tsx' | grep -v "x402Fetch" ; then
  echo "❌ Direct payment proxy purchase calls must use x402Fetch, not fetch()"
  exit 1
fi

echo "✅ x402Fetch enforced"