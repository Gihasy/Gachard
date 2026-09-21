#!/bin/bash

# BSCScan API Verification Script
# This script verifies the contract using the BSCScan API

CONTRACT_ADDRESS="0x3E1Cf18D6b94A4aCC438176b87E1387280aC87d4"
API_KEY="${BSCSCAN_API_KEY:?Set BSCSCAN_API_KEY before running this script. Never hardcode the key: this file is committed to a public repository.}"

echo "=========================================="
echo "BSCScan API Contract Verification"
echo "=========================================="
echo ""
echo "Contract: $CONTRACT_ADDRESS"
echo ""

# Step 1: Get the bytecode from BSCScan
echo "Step 1: Fetching bytecode from BSCScan..."
echo ""

BYTECODE=$(curl -s "https://api-testnet.bscscan.com/api?module=proxy&action=eth_getCode&address=$CONTRACT_ADDRESS&tag=latest&apikey=$API_KEY" | grep -o '"result":"[^"]*"' | cut -d'"' -f4)

if [ -z "$BYTECODE" ]; then
    echo "ERROR: Could not fetch bytecode from BSCScan"
    exit 1
fi

echo "Bytecode length: ${#BYTECODE} characters"
echo ""

# Step 2: Try verification with different compiler versions
echo "Step 2: Attempting verification..."
echo ""

# Try verification with the flattened contract
echo "Submitting verification request..."
echo ""

RESPONSE=$(curl -s -X POST "https://api-testnet.bscscan.com/api" \
    --data-urlencode "module=contract" \
    --data-urlencode "action=verifysourcecode" \
    --data-urlencode "contractaddress=$CONTRACT_ADDRESS" \
    --data-urlencode "sourceCode=$(cat contracts/flattened.sol)" \
    --data-urlencode "codeformat=solidity-single-file" \
    --data-urlencode "contractname=GachardCard" \
    --data-urlencode "compilerversion=v0.8.24+commit.e11b9ed9" \
    --data-urlencode "optimizationUsed=1" \
    --data-urlencode "runs=200" \
    --data-urlencode "licenseType=3" \
    --data-urlencode "apikey=$API_KEY")

echo "Response: $RESPONSE"
echo ""

# Check if verification was successful
if echo "$RESPONSE" | grep -q '"status":"1"'; then
    echo "✅ Verification submitted successfully!"
    echo ""
    echo "Check status at: https://testnet.bscscan.com/address/$CONTRACT_ADDRESS#code"
else
    echo "❌ Verification failed"
    echo ""
    echo "Possible issues:"
    echo "1. Bytecode mismatch - contract may have been compiled with different settings"
    echo "2. Wrong compiler version"
    echo "3. Wrong optimization settings"
    echo ""
    echo "Try manual verification at: https://testnet.bscscan.com/address/$CONTRACT_ADDRESS#code"
fi

echo ""
echo "=========================================="
echo "Alternative: Manual Verification"
echo "=========================================="
echo ""
echo "If API verification fails, try manual verification:"
echo ""
echo "1. Go to: https://testnet.bscscan.com/address/$CONTRACT_ADDRESS#code"
echo "2. Click 'Verify and Publish'"
echo "3. Select: Solidity (Single file)"
echo "4. Compiler: v0.8.24+commit.e11b9ed9"
echo "5. License: MIT"
echo "6. Paste content of 'flattened.sol'"
echo "7. Optimization: Yes, 200 runs"
echo "8. Click 'Verify and Publish'"
