# Smart Contract Verification Guide

## Contract Information

- **Address**: `0x56390137c171b3167D4055d199DA8Bc8eCeE219c`
- **Chain**: BNB Testnet (Chain ID 97)
- **Explorer**: https://testnet.bscscan.com
- **Compiler**: Solidity 0.8.24
- **Optimization**: Yes (200 runs)
- **License**: MIT

## What's Needed for Hackathon

### ✅ REQUIRED (Must Have)

1. **Contract Source Code**
   - Shows transparency and allows verification
   - Judges can read and audit the code
   - Proves the contract does what it claims

2. **Contract ABI**
   - Needed for frontend/backend interaction
   - Required for building applications on top of the contract
   - Enables third-party integrations

### ○ NICE TO HAVE (Optional)

3. **Contract Creation Code**
   - Bytecode used during deployment
   - Useful for redeployment or forking
   - Not critical for hackathon

4. **Deployed ByteCode**
   - Bytecode currently on blockchain
   - Can be used for verification
   - Not critical for hackathon

## Verification Methods

### Method 1: BSCScan Website (Easiest)

1. Go to: https://testnet.bscscan.com/address/0x56390137c171b3167D4055d199DA8Bc8eCeE219c#code

2. Click **"Verify and Publish"** button

3. Fill in the form:
   - **Contract Address**: `0x56390137c171b3167D4055d199DA8Bc8eCeE219c`
   - **Compiler Type**: Solidity (Single file)
   - **Compiler Version**: `v0.8.24+commit.e11b9ed9`
   - **License**: MIT License (MIT)

4. In **"Contract Code"** field:
   - Copy entire content of `contracts/flattened.sol`
   - Paste it into the field

5. **Optimization**:
   - Select: Yes
   - Runs: 200

6. Click **"Verify and Publish"**

### Method 2: BSCScan API (Advanced)

```bash
curl -X POST 'https://api-testnet.bscscan.com/api' \
  --data-urlencode 'module=contract' \
  --data-urlencode 'action=verifysourcecode' \
  --data-urlencode 'contractaddress=0x56390137c171b3167D4055d199DA8Bc8eCeE219c' \
  --data-urlencode 'sourceCode=@contracts/flattened.sol' \
  --data-urlencode 'codeformat=solidity-single-file' \
  --data-urlencode 'contractname=GachardCard' \
  --data-urlencode 'compilerversion=v0.8.24+commit.e11b9ed9' \
  --data-urlencode 'optimizationUsed=1' \
  --data-urlencode 'runs=200' \
  --data-urlencode 'licenseType=3' \
  --data-urlencode 'apikey=VVJZYE57SQPKNV6BWHBSXQK6N64MBRG33K'
```

### Method 3: Foundry (If Installed)

```bash
cd contracts
forge verify-contract \
  --chain-id 97 \
  --compiler-version 0.8.24 \
  --optimizer-runs 200 \
  0x56390137c171b3167D4055d199DA8Bc8eCeE219c \
  src/GachardCard.sol:GachardCard \
  --etherscan-api-key VVJZYE57SQPKNV6BWHBSXQK6N64MBRG33K
```

## After Verification

Once verified, you'll get:

### ✅ Contract Source Code
- Readable Solidity code on BSCScan
- Anyone can audit the code
- Shows transparency

### ✅ Contract ABI
- JSON ABI for interaction
- Available on contract page under "Contract" tab
- Can be copied for use in applications

### ✅ Contract Creation Code
- Bytecode used during deployment
- Available on contract page

### ✅ Deployed ByteCode
- Bytecode currently on blockchain
- Available on contract page

## Verification Checklist

After verification, check these on BSCScan:

- [ ] Source code is readable
- [ ] ABI is generated
- [ ] All functions are visible
- [ ] Events are listed
- [ ] Read/Write Contract tabs work
- [ ] Token transfers are decoded

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

## Security Features

All security fixes are included:

- **C-1**: `require(previousOwner != address(0))` in `redeemCard()`
- **C-2**: `require(ownerAddress != address(0))` + `require(balanceOf(ownerAddress, tokenId) == 1)` in `requestPrint()`
- **H-1**: `redeemCard()` is `onlyOwner` (was public)
- **H-2**: `_update()` updates `lastOwner` on standard transfers

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

## For Hackathon Judges

After verification, judges can:

1. **Read the source code** on BSCScan
2. **Interact with the contract** using the ABI
3. **Verify all transactions** are legitimate
4. **See the AI Anomaly Detection** in action
5. **Check security fixes** are properly implemented

This demonstrates:
- ✅ Transparency
- ✅ Security
- ✅ Blockchain integration
- ✅ AI features
- ✅ Production-ready code
