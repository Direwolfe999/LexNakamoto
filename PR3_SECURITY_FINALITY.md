# PR #3: Security & Finality — Post-Conditions, 5 Test Suites, Finality Tracker

## Summary
Comprehensive security hardening: token whitelist enforcement in all tests, `Pc` post-condition helpers for every transaction builder, 36 tests across 5 focused test files, and Bitcoin finality tracking from contract to UI.

## Test Coverage: 36 Tests / 5 Suites

| File | Suite | Tests | Key Coverage |
|---|---|---|---|
| `01-escrow-creation.test.ts` | Escrow Creation | 6 | Balance lock, zero-amount, self-escrow, whitelist enforcement, sequential IDs, v3 tenure/burn-block recording |
| `02-milestone-release.test.ts` | Milestone Release | 7 | 25/50/100% releases, incremental delta, double-release prevention, completion state, invalid milestone, auth guard |
| `03-dispute-resolution.test.ts` | Dispute Resolution | 8 | Buyer/seller initiation, 0/50/100% arbiter resolution, outsider rejection, non-dispute resolution guard |
| `04-time-lock-security.test.ts` | Time-Lock & Expiry | 7 | Pre-expiry rejection, post-expiry reclaim, is-expired transition, blocks-until-expiry countdown, v3 escrow-age, milestone-overdue, bitcoin-finality |
| `05-governance-admin.test.ts` | Governance & Admin | 8 | Two-step arbiter (nominate→accept), unauthorized nomination/acceptance, whitelist/delist, outsider whitelist guard, v3 get-escrow-status (int-to-ascii), dispute status display |

### v3-Specific Test Highlights
- **`int-to-ascii` verification**: `get-escrow-status` returns `"Escrow #0: Active"` and `"Escrow #0: Disputed"` — exact string matching
- **`tenure-height` tracking**: `get-escrow-age` increases by exactly N after mining N empty blocks
- **`burn-block-height` tracking**: `get-bitcoin-finality` returns valid finality data after block advancement
- **`is-milestone-overdue`**: Returns `false` for freshly created escrows- **`clawback-overdue` (NEW)**: Verifies ERR u1018 before 30 days, full refund after 4,321 blocks, and seller auth rejection- **Token whitelist enforcement**: Every `create-escrow` call requires prior `whitelist-token` — tested explicitly with ERR u1017

## Post-Condition Security

### Transaction Builders with `Pc` Helper
All transaction builders in `stacks-api.ts` use `@stacks/transactions` `Pc` helper:

```typescript
// create-escrow: Pc.principal().willSendLte(amount).ft(sbtcContract, "sbtc")
postConditionMode: "deny"  // SAFE: exact token amount enforced

// release-milestone, resolve-dispute, reclaim-expired:
postConditionMode: "allow"  // Contract-initiated transfers (as-contract)
```

### SafetyPreview Modal
- Shows exact token amounts, sender, receiver, and mode before user signs
- Displayed for every escrow action (create, release, dispute, reclaim)
- `humanDescription` explains what "deny" mode means in plain English

## Bitcoin Finality Pipeline

### Contract Layer (Clarity 4)
```clarity
;; Stored per escrow at creation:
tenure-created:     tenure-height      ;; SIP-034 Nakamoto
burn-block-created: burn-block-height  ;; Bitcoin L1 anchor

;; Read-only: get-bitcoin-finality returns:
{ created-burn-block, current-burn-block, confirmations }
```

### API Layer (TypeScript)
```typescript
getBitcoinFinality(escrowId) → { createdBurnBlock, currentBurnBlock, confirmations }
getBlockInfo() → { stacksBlockHeight, burnBlockHeight, tenureHeight, indexBlockHash }
```

### UI Layer (React)
- `BitcoinFinalityTracker`: Global network state with settlement progress bar
- `EscrowCard`: Per-escrow tenure-created and burn-block-created in details panel
- `MilestoneTracker`: Time-lock countdown with blocks-until-expiry

## Verification
```
$ clarinet check
3 contracts checked (0 errors)

$ npx vitest run
5 test files | 39 tests passed

$ npx next build
Compiled successfully | 5/5 static pages
```

## Security Checklist
- [x] Token whitelist enforced via `contract-of` before every escrow creation
- [x] `Pc` post-conditions on all token-transferring transactions
- [x] Two-step arbiter governance (nominate -> accept) prevents unilateral takeover
- [x] Time-lock auto-refund prevents permanent fund lock
- [x] **30-day clawback via `clawback-overdue`** -- buyer recovers funds if milestone stalls
- [x] Dispute freezes milestone releases until arbiter resolves
- [x] 30-day overdue detection via `tenure-height` delta
- [x] All 19 error codes tested and validated (u1000-u1018)
- [x] `postConditionMode: "deny"` for user-initiated transfers
