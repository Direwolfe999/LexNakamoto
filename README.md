# LexNakamoto - Milestone-Based sBTC Escrow Protocol

> LexNakamoto is a milestone-based escrow protocol for the Stacks Nakamoto era.
> Built with Clarity, it enables trustless sBTC payments for services.
> Funds lock in-contract and release in 25%, 50%, or 100% increments upon buyer
> approval. Features include a dispute resolution layer and post-condition
> security to ensure Bitcoin-level finality.
>
> Built for the **Code for STX March 2026 Jackpot** competition.

---

## Overview

LexNakamoto is a production-grade escrow smart contract on the **Stacks blockchain** that uses **sBTC** (SIP-010 fungible token) to facilitate trustless buyer-seller transactions. Funds lock in-contract upon escrow creation and release in milestone increments (25%, 50%, or 100%) only upon buyer approval. A built-in dispute resolution layer with arbiter-controlled fund splitting and post-condition security guards ensure **Bitcoin-level finality** for every transaction.

### Key Features

| Feature | Description |
|---|---|
| **Milestone Releases** | Buyer releases funds at 25%, 50%, or 100% checkpoints |
| **Dispute Resolution** | Either party can escalate; a neutral arbiter resolves |
| **sBTC Native** | Holds real Bitcoin value via the sBTC SIP-010 token |
| **Expiry Protection** | Buyer can reclaim funds after the lock period expires |
| **Post-Condition Safety** | All token transfers use explicit asserts! guards |
| **Delta Transfers** | Only the incremental amount moves at each milestone |

---

## Architecture

```
contracts/
  sip-010-ft-standard.clar   # SIP-010 Fungible Token trait definition
  mock-sbtc.clar              # Mock sBTC token for simnet testing
  lex-nakamoto-escrow.clar    # Core escrow logic (426 lines)

tests/
  lex-nakamoto-escrow.test.ts # 20 Vitest tests across 5 suites

settings/
  Devnet.toml                 # Pre-funded simnet accounts
```

### Contract Functions

| Function | Access | Description |
|---|---|---|
| create-escrow | Public | Lock sBTC in escrow with a seller and optional lock period |
| release-milestone | Public (buyer only) | Release 25%, 50%, or 100% of funds to the seller |
| initiate-dispute | Public (buyer/seller) | Freeze the escrow and escalate to arbiter |
| resolve-dispute | Public (arbiter only) | Split remaining funds between buyer and seller |
| reclaim-expired | Public (buyer only) | Withdraw all remaining funds after expiry |
| set-platform-arbiter | Public (deployer only) | Update the platform arbiter address |
| get-escrow | Read-only | Query escrow details by ID |
| get-remaining-balance | Read-only | Check how much is still locked |
| get-escrow-count | Read-only | Total number of escrows created |
| is-escrow-expired | Read-only | Check if an escrow has passed its expiry block |

### Escrow Lifecycle

```
  create-escrow (buyer locks sBTC)
        |
        v
  [STATE: ACTIVE]
   /        |        \
  v         v         v
release   initiate   reclaim
milestone  dispute   expired
(25/50/100%) |       (after expiry)
  |         v
  |   [STATE: DISPUTED]
  |         |
  |    resolve-dispute
  |    (arbiter splits)
  v         |
[STATE:     v
COMPLETED] [STATE: COMPLETED/REFUNDED]
```

---

## Prerequisites

- **Clarinet** v3.x+ (https://docs.hiro.so/clarinet/getting-started)
- **Node.js** v20+ (required by Vitest 4)
- **npm** v9+

---

## Quick Start

### 1. Clone and Install

```bash
cd lex-nakamoto
npm install
```

### 2. Check Contracts

```bash
clarinet check
```

Expected output:
```
3 contracts checked
```

### 3. Run Tests

```bash
npm test
```

Expected output:
```
 tests/lex-nakamoto-escrow.test.ts (20 tests)
   Escrow Creation (4)
   Milestone Release (4)
   Security - Unauthorized Access (5)
   Dispute Resolution (4)
   Read-Only Functions (3)

 Test Files  1 passed (1)
      Tests  20 passed (20)
```

### 4. Interactive Console

```bash
clarinet console
```

```clarity
;; Mint tokens to buyer
(contract-call? .mock-sbtc mint u100000000 tx-sender)

;; Create an escrow
(contract-call? .lex-nakamoto-escrow create-escrow
  'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG
  u100000000
  u2016
)

;; Release 25% milestone
(contract-call? .lex-nakamoto-escrow release-milestone u0 u25)
```

---

## Test Suites

| Suite | Tests | Coverage |
|---|---|---|
| **Escrow Creation** | 4 | Happy path, zero amount, self-escrow, ID increment |
| **Milestone Release** | 4 | 25% release, 25+50% incremental, 100% completion, invalid % |
| **Security** | 5 | Unauthorized release, seller release, outsider dispute, non-arbiter resolve, disputed release |
| **Dispute Resolution** | 4 | Buyer dispute, seller dispute, 100% to seller, full refund |
| **Read-Only** | 3 | Escrow count, partial balance, nonexistent escrow |

---

## Mainnet Deployment

### Step 1: Replace Mock sBTC

In contracts/lex-nakamoto-escrow.clar, update the transfer-from-escrow private
function to reference the real sBTC contract on mainnet:

```clarity
;; Replace .mock-sbtc with the actual mainnet sBTC contract:
(contract-call? 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token
  transfer amount (as-contract tx-sender) recipient (some memo))
```

### Step 2: Update Clarinet.toml

Remove mock-sbtc and sip-010-ft-standard from the contract list (the mainnet
sBTC contract already implements SIP-010).

### Step 3: Deploy with Stacks.js

```typescript
import { makeContractDeploy, broadcastTransaction } from "@stacks/transactions";
import { StacksMainnet } from "@stacks/network";
import * as fs from "fs";

const network = new StacksMainnet();
const codeBody = fs.readFileSync("contracts/lex-nakamoto-escrow.clar", "utf-8");

const txOptions = {
  contractName: "lex-nakamoto-escrow",
  codeBody,
  senderKey: "<YOUR_PRIVATE_KEY>",
  network,
  anchorMode: 3,
  postConditionMode: 2,
  fee: 50000n,
};

const tx = await makeContractDeploy(txOptions);
const result = await broadcastTransaction({ transaction: tx, network });
console.log("TX ID:", result.txid);
```

### Step 4: Verify Deployment

```bash
curl https://api.mainnet.hiro.so/v2/contracts/source/<DEPLOYER_ADDR>/lex-nakamoto-escrow
```

---

## Security Considerations

1. **Arithmetic Safety** - All unsigned integer subtractions are guarded with
   if (> a b) checks to prevent underflow.
2. **Authorization** - Every state-changing function validates tx-sender
   against the escrow's stored buyer, seller, or arbiter.
3. **State Machine** - Escrows follow a strict state progression
   (ACTIVE -> DISPUTED/COMPLETED/REFUNDED) with guards preventing
   invalid transitions.
4. **Delta Transfers** - Milestone releases compute and transfer only the
   incremental difference, preventing double-spend.
5. **Expiry Protection** - reclaim-expired requires the current block height
   to exceed the escrow's expiry block.
6. **Trait Verification** - The create-escrow function stores the token
   contract principal and verifies it matches on subsequent operations.

---

## Error Codes

| Code | Name | Description |
|---|---|---|
| u1000 | ERR-NOT-AUTHORIZED | Caller is not authorized for this action |
| u1001 | ERR-ESCROW-NOT-FOUND | No escrow exists with the given ID |
| u1002 | ERR-ALREADY-INITIALIZED | Escrow was already initialized |
| u1003 | ERR-INVALID-AMOUNT | Zero amount or zero delta after calculation |
| u1004 | ERR-INVALID-MILESTONE | Milestone percentage is not 25, 50, or 100 |
| u1005 | ERR-ESCROW-NOT-ACTIVE | Escrow is not in ACTIVE state |
| u1006 | ERR-ESCROW-IN-DISPUTE | Escrow is currently disputed |
| u1007 | ERR-ESCROW-ALREADY-COMPLETE | Escrow has already been completed |
| u1008 | ERR-MILESTONE-EXCEEDS-TOTAL | Milestone amount exceeds total escrow |
| u1009 | ERR-TRANSFER-FAILED | Token transfer operation failed |
| u1010 | ERR-ESCROW-EXPIRED | Escrow has expired |
| u1011 | ERR-ESCROW-NOT-EXPIRED | Escrow has not yet expired |
| u1012 | ERR-NOT-DISPUTED | Escrow is not in disputed state |
| u1013 | ERR-SELF-ESCROW | Buyer and seller cannot be the same address |
| u1014 | ERR-INVALID-RESOLUTION | Dispute resolution percentage exceeds 100 |

---

## Tech Stack

- **Clarity** (Nakamoto era) - Smart contract language for Stacks with Bitcoin-level finality
- **Clarinet v3.14** - Development framework, simnet, and CLI
- **Vitest v4** - Test runner with Clarinet SDK environment
- **SIP-010** - Fungible token standard for sBTC interop
- **Stacks Nakamoto** - Target network epoch with fast blocks

---

## License

MIT

---

*Built with Bitcoin conviction. LexNakamoto - Code for STX March 2026.*
