# Smart Contract Verification Guide — BSCScan

## Contract Information

- **Contract Address**: `0x56390137c171b3167D4055d199DA8Bc8eCeE219c`
- **Chain**: BNB Testnet (Chain ID 97)
- **Explorer**: https://testnet.bscscan.com/address/0x56390137c171b3167D4055d199DA8Bc8eCeE219c
- **Compiler**: Solidity 0.8.24
- **Optimization**: Yes (200 runs)

## Verification Steps

### Step 1: Go to BSCScan

1. Open: https://testnet.bscscan.com/address/0x56390137c171b3167D4055d199DA8Bc8eCeE219c#code
2. Click **"Verify and Publish"** button

### Step 2: Select Verification Method

Choose: **"Solidity (Single file)"**

### Step 3: Fill in Details

| Field | Value |
|-------|-------|
| **Compiler Type** | Solidity (Single file) |
| **Compiler Version** | v0.8.24+commit.e11b9ed9 |
| **License** | MIT License (MIT) |

### Step 4: Paste Source Code

Copy the entire content of `flattened.sol` and paste it into the "Contract Code" field.

### Step 5: Constructor Arguments

**Leave empty** — the contract has no constructor arguments.

### Step 6: Optimization

| Field | Value |
|-------|-------|
| **Optimization** | Yes |
| **Runs** | 200 |

### Step 7: Verify

Click **"Verify and Publish"**

## Alternative: Using Foundry (if installed)

```bash
cd contracts

# Verify with Foundry
forge verify-contract \
  --chain-id 97 \
  --compiler-version 0.8.24 \
  --optimizer-runs 200 \
  0x56390137c171b3167D4055d199DA8Bc8eCeE219c \
  src/GachardCard.sol:GachardCard \
  --etherscan-api-key $BSCSCAN_API_KEY
```

## After Verification

Once verified, the contract page will show:

✅ **Source Code** — Readable Solidity code
✅ **Contract ABI** — JSON ABI for interaction
✅ **Contract Creation Code** — Bytecode used to deploy
✅ **Deployed ByteCode** — Bytecode on-chain

## Contract Features

This contract implements:

1. **ERC-1155 Multi-Token** — Each card is a unique token
2. **Card Status Machine** — Digital → Vaulted → Digital
3. **Mint Functions** — `mintCard()`, `mintBatch()`
4. **Print/Redeem** — `requestPrint()`, `redeemCard()`
5. **Marketplace** — `marketplaceTransfer()`
6. **Burn** — `burnCard()` for dismantle feature
7. **AI Verification** — `recordVerification()` for risk scoring
8. **Access Control** — `onlyOwner` for all operations

## Verification Checklist

After verification, verify these on BSCScan:

- [ ] Source code is readable
- [ ] ABI is generated
- [ ] All functions are visible
- [ ] Events are listed
- [ ] Read/Write Contract tabs work
- [ ] Token transfers are decoded

## Troubleshooting

### "Already Verified"
If the contract is already verified, you'll see the source code directly.

### "Bytecode Mismatch"
Ensure you're using:
- Compiler: `v0.8.24+commit.e11b9ed9`
- Optimization: Yes, 200 runs
- No constructor arguments

### "Invalid ABI"
Make sure you're using the flattened version (`flattened.sol`), not the original file with imports.
