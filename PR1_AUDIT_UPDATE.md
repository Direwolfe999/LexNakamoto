# PR 1: Smart Contract Audit & Real-World Upgrades
*   **Feature 1: Invoice/IPFS Metadata Hashing.** Real-world B2B payments require legal invoices. We added `invoice-hash` (32-byte buffer) to the escrow struct to irrefutably link on-chain payments to off-chain legal agreements.
*   **Feature 2: Mutual Partial Refunds.** Arbiter intervention is expensive. We added a `mutual-refund` flow where buyer and seller can cryptographically agree to a split without paying arbiter fees.
*   **Feature 3: Nakamoto Time-Lock Fixes.** Corrected time-lock constants for ~5s Nakamoto block times (241,920 blocks for 14 days) preventing premature clawback attacks.
