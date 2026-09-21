# Smart Contract Verification

The contract is **verified on BscScan Testnet**. Its Solidity source, ABI and read/write tabs are
public, so anyone can audit the code and replay the state transitions the app claims to make.

- **Address**: [`0x3E1Cf18D6b94A4aCC438176b87E1387280aC87d4`](https://testnet.bscscan.com/address/0x3E1Cf18D6b94A4aCC438176b87E1387280aC87d4#code)
- **Chain**: BNB Testnet (Chain ID 97)
- **Compiler**: `v0.8.24+commit.e11b9ed9`
- **Optimizer**: enabled, 200 runs
- **Constructor arguments**: none — `constructor() ERC1155("") Ownable(msg.sender) {}`
- **License**: MIT

## What the Contract Implements

1. **BEP-1155 multi-token** — one unique token ID per card (ADR-001)
2. **Card status machine** — `Digital` → `Vaulted` → `Digital`, enforced in `_update()`
3. **Minting** — `mintCard()` and `mintBatch()`, one transaction per pack
4. **Print and redeem** — `requestPrint()` moves the token into the vault, `redeemCard()` releases it
5. **Marketplace** — `marketplaceTransfer()`
6. **Burn** — `burnCard()`, used by the dismantle feature
7. **Verification oracle** — `recordVerification()` stores a trade's risk score on-chain
8. **Access control** — `onlyOwner` on every state-changing operation

Note on item 7: the function exists and works, but nothing calls it while the `ENABLE_AI` flag is
off (ADR-030). Scores recorded on-chain date from when the flag was on.

## Security Fixes Included

- **C-1**: `require(previousOwner != address(0))` in `redeemCard()`
- **C-2**: `require(ownerAddress != address(0))` and `require(balanceOf(ownerAddress, tokenId) == 1)` in `requestPrint()`
- **H-1**: `redeemCard()` is `onlyOwner`; it was public
- **H-2**: `_update()` refreshes `lastOwner` on standard transfers

## Reproducing the Verification

Only needed after a redeploy. Set `BSCSCAN_API_KEY` in your environment first; the scripts in this
directory refuse to run without it, and the key must never be committed.

### Foundry (preferred)

```bash
cd contracts
forge verify-contract \
  --chain-id 97 \
  --compiler-version 0.8.24 \
  --optimizer-runs 200 \
  <CONTRACT_ADDRESS> \
  src/GachardCard.sol:GachardCard \
  --etherscan-api-key "$BSCSCAN_API_KEY"
```

### BscScan web form

1. Open the contract page and choose **Verify and Publish**
2. Compiler type: Solidity (single file)
3. Compiler version `v0.8.24+commit.e11b9ed9`, optimization Yes with 200 runs, license MIT
4. Paste the contents of `contracts/flattened.sol`, not `src/GachardCard.sol`, because the source
   imports OpenZeppelin and the form expects a single flattened file

### API

BscScan retired its V1 endpoints. `https://api-testnet.bscscan.com/api` now answers every request
with *"You are using a deprecated V1 endpoint, switch to Etherscan API V2"*, so any older script or
snippet pointing there will fail. Use the Etherscan V2 endpoint with the chain id instead:

```
https://api.etherscan.io/v2/api?chainid=97&...
```

## If Verification Fails

**Bytecode mismatch** is almost always a settings mismatch rather than a code problem. Confirm the
compiler is exactly `v0.8.24+commit.e11b9ed9`, optimization is on with 200 runs, and that no
constructor arguments are supplied, since this contract takes none.

**Invalid ABI** usually means the original source was pasted instead of `flattened.sol`. The
unflattened file cannot resolve its OpenZeppelin imports inside the verifier.

**Already verified** is not an error. The source is already published and visible on the contract
page.
