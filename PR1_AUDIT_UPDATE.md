# PR #1: Audit & Update — Clarity 4 Contract v3

## Summary
Full audit of `lex-nakamoto-escrow.clar` and upgrade from v2 to v3, leveraging three Clarity 4 built-ins (`int-to-ascii`, `tenure-height`, `burn-block-height`) that shipped with the Stacks Nakamoto release.

## What Changed

### New Read-Only Functions (Clarity 4)
| Function | Built-In Used | Purpose |
|---|---|---|
| `get-escrow-status` | `int-to-ascii` | Returns human-readable `"Escrow #42: Active"` — no off-chain lookup needed |
| `get-escrow-age` | `tenure-height` | Computes escrow age in tenure blocks via delta from stored `tenure-created` |
| `is-milestone-overdue` | `tenure-height` | Flags escrows with no milestone release in 30+ days (4,320 tenure blocks) |
| `get-bitcoin-finality` | `burn-block-height` | Returns `{ created-burn-block, current-burn-block, confirmations }` for L1 settlement tracking |
### New Public Function: `clawback-overdue`
If a milestone hasn't been met in 30 days (4,320 tenure blocks), the **buyer** can claw back all remaining funds. This is the enforcement arm of `is-milestone-overdue`:

```clarity
(define-public (clawback-overdue (escrow-id uint) (token <ft-trait>))
;; Checks: buyer auth, STATE-ACTIVE, tenure age >= 4320, remaining > 0
;; Action: transfers remaining to buyer, sets STATE-REFUNDED
;; Print: { event: "milestone-clawback", age-tenures: <tenure-delta> }
```

- **Error**: `ERR-MILESTONE-NOT-OVERDUE (u1018)` -- returned if < 30 days elapsed
- **Memo**: `0x434c415742414348` ("CLAWBACK") for on-chain audit trail
### Escrow Map Extensions
```clarity
tenure-created:     uint   ;; tenure-height at creation (SIP-034)
burn-block-created: uint   ;; burn-block-height at creation (L1 anchor)
```

### New Constants
- `THIRTY-DAYS-IN-BLOCKS` (u4320) — 30-day deadline for milestone overdue detection
- `SBTC-MAINNET-DEPLOYER` — `SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4` for future `contract-of` mainnet verification

### Private Helper
- `state-to-ascii` — maps state uint to `"Active"`, `"Disputed"`, `"Completed"`, `"Refunded"` for `get-escrow-status`

## Audit Findings (v2 → v3)
- **All 19 error codes preserved** (u1000-u1018)
- **Token whitelist enforced** via `contract-of` before every `create-escrow`
- **Two-step governance** (nominate -> accept) unchanged
- **Time-lock auto-refund** via `reclaim-expired` with `stacks-block-height` comparison unchanged
- **30-day clawback** via `clawback-overdue` with `tenure-height` enforcement (NEW)
- **No breaking changes** to existing public function signatures

## Verification
```
$ clarinet check
3 contracts checked (12 warnings, 0 errors)

$ npx vitest run
5 test files | 39 tests passed
```

## Relevant SIPs
- **SIP-033**: Block-time awareness (`stacks-block-height`, `tenure-height`, `burn-block-height`)
- **SIP-034**: Nakamoto tenure model (deterministic tenure-height per Bitcoin block)
- **int-to-ascii**: Clarity 4 built-in for uint → string-ascii conversion
