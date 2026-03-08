# 🏛️ LexNakamoto: Milestone-Based sBTC Escrow

**LexNakamoto** is a professional-grade, trustless escrow protocol designed for the Stacks Nakamoto era. It enables secure, decentralized service agreements using **sBTC**, allowing for milestone-based payments and robust dispute resolution.

---

## 🚀 Overview
In a decentralized economy, trust is the biggest barrier to trade. **LexNakamoto** removes the need for "blind trust" between freelancers and clients. 

By utilizing **Clarity 3**, this smart contract ensures that sBTC is only released when specific project milestones are met, or returned if the terms of the contract are violated.

### Key Features
* **sBTC Native:** Built specifically for the SIP-010 sBTC token standard.
* **Milestone Payments:** Release funds in 25%, 50%, or 100% increments as work is completed.
* **Nakamoto-Ready:** Optimized for the fast-block finality of the Stacks 2024-2026 upgrades.
* **Dispute Layer:** Integrated logic for a third-party arbiter (DAO or Admin) to resolve conflicts.
* **Post-Condition Security:** Fully compatible with Stacks.js post-conditions to prevent unauthorized asset transfers.

---

## 🛠️ Technical Architecture

### Smart Contract Logic (`contracts/lex-nakamoto-escrow.clar`)
The contract manages the state of every escrow agreement via a `Data Map`. 
- **Status 0:** Pending (Funds locked)
- **Status 1:** In-Progress (Partial milestones released)
- **Status 2:** Completed (All funds released)
- **Status 3:** Disputed (Funds frozen for arbitration)

### Built With
* **Language:** Clarity 3.0
* **Framework:** Clarinet
* **Standard:** SIP-010 (sBTC)
* **Testing:** Vitest (Stacks/Clarinet SDK)

---

## 📋 How It Works

1.  **Initiate:** The Buyer calls `create-escrow`, locking the total sBTC amount into the LexNakamoto contract.
2.  **Milestones:** As the Seller completes tasks, the Buyer calls `release-milestone`. The contract calculates the percentage and transfers that portion of sBTC immediately.
3.  **Completion:** Once 100% of milestones are reached, the escrow is marked as `Completed`.
4.  **Dispute:** If a conflict arises, either party can trigger `initiate-dispute`, which freezes the remaining balance until the `arbiter` address provides a resolution.

---

## 💻 Installation & Testing

### Prerequisites
* [Clarinet](https://github.com/hirosystems/clarinet) installed.
* A Stacks wallet (Leather, Xverse, or OKX).

### Setup
```bash
# Clone the repository
git clone https://github.com/Direwolfe999/LexNakamoto.git
# Navigate to the folder
cd lex-nakamoto

# Check the contract
clarinet check

# Run the unit tests
clarinet test# LexNakamoto
