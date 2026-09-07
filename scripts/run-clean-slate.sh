#!/bin/bash

# Clean Slate Script - Delete all data from production database
# This will delete ALL data except card_templates

PROD_URL="https://www.gachard.com"
ADMIN_USER="admin-97df4f37"
ADMIN_PASS="lTFxRfCLH3hma1s-aMtrCxtu"

echo "=========================================="
echo "GACHARD CLEAN SLATE"
echo "=========================================="
echo ""
echo "⚠️  WARNING: This will delete ALL data from production!"
echo ""
echo "Collections to be deleted:"
echo "  - cards"
echo "  - transactions"
echo "  - redeem_codes"
echo "  - rate_limits"
echo "  - shipping_addresses"
echo "  - payments"
echo "  - listings"
echo "  - wishlist"
echo "  - supporters"
echo "  - crystal_balances"
echo "  - creator_applications"
echo "  - users (if includeUsers=true)"
echo ""
echo "Preserved:"
echo "  - card_templates"
echo ""

# Run clean slate (preserve users)
echo "Running clean slate (preserving users)..."
echo ""

RESPONSE=$(curl -s -X POST "$PROD_URL/api/admin/clean-slate" \
  -u "$ADMIN_USER:$ADMIN_PASS" \
  -H "Content-Type: application/json")

echo "Response:"
echo "$RESPONSE" | python -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""

# Check if successful
if echo "$RESPONSE" | grep -q '"totalDeleted"'; then
    echo "✅ Clean slate completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Seed demo data: POST /api/seed-marketplace"
    echo "2. Seed on-chain data: POST /api/seed-onchain"
    echo "3. Verify at: https://www.gachard.com/admin"
else
    echo "❌ Clean slate failed"
    echo ""
    echo "Try running manually:"
    echo "curl -X POST '$PROD_URL/api/admin/clean-slate' \\"
    echo "  -u '$ADMIN_USER:$ADMIN_PASS' \\"
    echo "  -H 'Content-Type: application/json'"
fi

echo ""
echo "=========================================="
echo "To include users in deletion:"
echo "=========================================="
echo ""
echo "curl -X POST '$PROD_URL/api/admin/clean-slate?includeUsers=true' \\"
echo "  -u '$ADMIN_USER:$ADMIN_PASS' \\"
echo "  -H 'Content-Type: application/json'"
