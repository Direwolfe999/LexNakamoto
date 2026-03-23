# LexNakamoto Frontend

Next.js frontend for the LexNakamoto escrow demo.

## What it includes

- wallet connection and discovery
- escrow dashboard and creation flow
- settlement tracker and transaction feed
- sponsor-policy checks
- local developer helper routes that proxy to the optional backend

## Local setup

```bash
npm install
npm run dev
```

Use `frontend/.env.example` as the starting point for local env values.

## Hosted deployment

Vercel is a good fit for this frontend.

Set these env vars in Vercel:

- `NEXT_PUBLIC_NETWORK`
- `NEXT_PUBLIC_STACKS_API_URL`
- `NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS`
- `NEXT_PUBLIC_ESCROW_CONTRACT_NAME`
- `NEXT_PUBLIC_SBTC_CONTRACT`
- `BACKEND_API_URL` if you are also hosting the optional backend

Keep these disabled in hosted deployments:

- `NEXT_PUBLIC_ENABLE_LOCAL_DEPLOY_API=false`
- `ENABLE_LOCAL_CLARINET_DEPLOY=false`

## Local-only deploy helper

`src/pages/api/deploy.ts` shells out to `clarinet deployments apply`. That is only meant for local developer use.

Enable it only when running locally with both of these flags set to `true`:

- `NEXT_PUBLIC_ENABLE_LOCAL_DEPLOY_API`
- `ENABLE_LOCAL_CLARINET_DEPLOY`

For submission and hosted demos, deploy the contract with Clarinet or CI instead of from the browser.
