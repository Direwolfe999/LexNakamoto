# LexNakamoto

LexNakamoto is a milestone-based sBTC escrow project for Stacks. Buyers lock a whitelisted SIP-010 token into a Clarity contract, release 25%, 50%, or 100% milestones, raise disputes, reclaim expired escrows, and monitor settlement progress from a Next.js dashboard.

## Repo Layout

- `contracts/`
  - `lex-nakamoto-escrow.clar`: core escrow contract
  - `mock-sbtc.clar`: mock SIP-010 token for simnet and local demo flows
  - `sip-010-ft-standard.clar`: trait definition
- `tests/`
  - focused Clarinet/Vitest suites for creation, milestones, disputes, time-locks, governance, and regression coverage
- `frontend/`
  - Next.js dashboard, wallet integration, settlement tracker, and sponsored-transaction helpers
- `backend/`
  - optional Express service for sponsorship, transaction-status polling, and lightweight dispute records

## Verified Status

This branch has been checked locally with:

```bash
clarinet check
npm test
cd frontend && npm run build
cd ../backend && npm run build
```

Current results:

- `clarinet check`: passes for 3 contracts
- `npm test`: 59/59 tests passing across 6 test files
- `frontend`: production build passes
- `backend`: TypeScript build passes

## What The Contract Actually Does Today

- Creates escrow agreements between buyer and seller with a whitelisted SIP-010 token
- Releases 25%, 50%, or 100% milestones from the buyer to the seller
- Lets buyer or seller open disputes
- Lets the configured arbiter split remaining funds during dispute resolution
- Lets the buyer reclaim funds after the escrow expiry height
- Lets the buyer claw back overdue escrows after the 30-day threshold used by the app
- Exposes human-readable status strings through `get-escrow-status`
- Exposes height-based age and confirmation helpers that the UI can surface as progress indicators

## Honest Constraints

- `mock-sbtc.clar` is a demo/test token. It is not the mainnet sBTC contract.
- The escrow contract currently stores creation-height snapshots for the age/finality-style helpers. The repo should not claim that it persists true `tenure-height` or `burn-block-height` values on-chain yet.
- The backend keeps watched transactions, dispute records, and some rate-limit data in memory. That is fine for a demo backend, but it is not durable production storage.
- `frontend/src/pages/api/deploy.ts` is a local developer helper only. It is disabled by default and should not be relied on in hosted environments.

## Quick Start

### Contract and tests

```bash
cd lex-nakamoto
npm install
clarinet check
npm test
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Required frontend env values live in `frontend/.env.example`.

### Backend

```bash
cd backend
npm install
npm run dev
```

If you do not need sponsorship or backend-driven status/dispute routes, the frontend can still run without the optional backend.

## Deployment

### Smart contract

Deploy with Clarinet CLI or CI. After deployment, point the frontend at the deployed contract address and token contract.

### Frontend

Vercel is a good fit for the Next.js app.

Recommended Vercel setup:

- set `NEXT_PUBLIC_NETWORK`
- set `NEXT_PUBLIC_STACKS_API_URL`
- set `NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS`
- set `NEXT_PUBLIC_ESCROW_CONTRACT_NAME`
- keep `NEXT_PUBLIC_ENABLE_LOCAL_DEPLOY_API=false`
- keep `ENABLE_LOCAL_CLARINET_DEPLOY=false`

### Backend

Use Render, Railway, or Fly.io for the Express backend if you want sponsorship, status polling, or dispute APIs. It is not a great first fit for Vercel because it depends on a private sponsor key and currently keeps some state in memory.

## Submission Notes

For Code for STX, this repo is strongest when described as:

- a working Clarity escrow app with milestone releases and dispute handling
- a buildable frontend that surfaces escrow and settlement state clearly
- a demo backend for sponsorship/status workflows
- an honest in-progress product, not a finished mainnet custody system
