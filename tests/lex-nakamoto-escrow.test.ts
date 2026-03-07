// ============================================================================
// LexNakamoto Escrow - Vitest Unit Tests
// ============================================================================
// These tests validate the core escrow lifecycle: creation, milestone release,
// dispute handling, and security (unauthorized access prevention).
// Uses the Clarinet SDK simnet environment with Vitest matchers.
// ============================================================================

import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

// ---------------------------------------------------------------------------
// Account Setup
// ---------------------------------------------------------------------------
const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const buyer    = accounts.get("wallet_1")!;
const seller   = accounts.get("wallet_2")!;
const outsider = accounts.get("wallet_3")!;

const escrowContract   = "lex-nakamoto-escrow";
const mockSbtcContract = `${deployer}.mock-sbtc`;

// 1 sBTC = 100_000_000 sats (8 decimals).
const ONE_SBTC = 100_000_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function mintSbtc(recipient: string, amount: number) {
  authorizeRecipient(Cl.principal(recipient));
  return simnet.callPublicFn(
    "mock-sbtc", "mint",
    [Cl.uint(amount), Cl.principal(recipient)],
    deployer
  );
}

function authorizeRecipient(recipient: any) {
  return simnet.callPublicFn(
    "mock-sbtc", "authorize-recipient",
    [recipient],
    deployer
  );
}

function syncTokenPermissions() {
  // Required by mock-sbtc transfer guards:
  // - buyer must be trusted for mint target
  // - escrow contract must be trusted for lock transfer recipient
  // - seller must be trusted for milestone/dispute payouts
  authorizeRecipient(Cl.principal(buyer));
  authorizeRecipient(Cl.principal(seller));
  authorizeRecipient(Cl.contractPrincipal(deployer, escrowContract));
}

function createStandardEscrow(amount: number = ONE_SBTC, lockPeriod: number = 0) {
  syncTokenPermissions();
  // Whitelist mock-sbtc before every escrow creation (idempotent).
  whitelistMockSbtc();
  return simnet.callPublicFn(
    escrowContract, "create-escrow",
    [
      Cl.principal(seller),
      Cl.uint(amount),
      Cl.uint(lockPeriod),
      Cl.contractPrincipal(deployer, "mock-sbtc"),
    ],
    buyer
  );
}

function whitelistMockSbtc() {
  return simnet.callPublicFn(
    escrowContract, "whitelist-token",
    [Cl.contractPrincipal(deployer, "mock-sbtc")],
    deployer
  );
}

// ============================================================================
// TEST SUITE 1: Escrow Creation
// ============================================================================
describe("Escrow Creation", () => {

  it("successfully creates an escrow and locks sBTC", () => {
    mintSbtc(buyer, ONE_SBTC);
    const { result } = createStandardEscrow();
    expect(result).toBeOk(Cl.uint(0));

    // Verify buyer balance is zero (tokens locked in contract).
    const buyerBalance = simnet.callReadOnlyFn(
      "mock-sbtc", "get-balance", [Cl.principal(buyer)], deployer
    );
    expect(buyerBalance.result).toBeOk(Cl.uint(0));

    // Verify escrow exists and has correct key fields.
    const escrow = simnet.callReadOnlyFn(
      escrowContract, "get-escrow", [Cl.uint(0)], deployer
    );
    // The escrow should exist (not none).
    expect(escrow.result).not.toBeNone();

    // Verify remaining balance equals total amount.
    const remaining = simnet.callReadOnlyFn(
      escrowContract, "get-remaining-balance", [Cl.uint(0)], deployer
    );
    expect(remaining.result).toBeOk(Cl.uint(ONE_SBTC));
  });

  it("rejects escrow creation with zero amount", () => {
    mintSbtc(buyer, ONE_SBTC);
    const { result } = simnet.callPublicFn(
      escrowContract, "create-escrow",
      [Cl.principal(seller), Cl.uint(0), Cl.uint(0),
       Cl.contractPrincipal(deployer, "mock-sbtc")],
      buyer
    );
    expect(result).toBeErr(Cl.uint(1003));
  });

  it("rejects self-escrow (buyer == seller)", () => {
    mintSbtc(buyer, ONE_SBTC);
    const { result } = simnet.callPublicFn(
      escrowContract, "create-escrow",
      [Cl.principal(buyer), Cl.uint(ONE_SBTC), Cl.uint(0),
       Cl.contractPrincipal(deployer, "mock-sbtc")],
      buyer
    );
    expect(result).toBeErr(Cl.uint(1013));
  });

  it("increments escrow ID for each new escrow", () => {
    mintSbtc(buyer, ONE_SBTC * 3);
    const { result: r1 } = createStandardEscrow(ONE_SBTC);
    const { result: r2 } = createStandardEscrow(ONE_SBTC);
    const { result: r3 } = createStandardEscrow(ONE_SBTC);
    expect(r1).toBeOk(Cl.uint(0));
    expect(r2).toBeOk(Cl.uint(1));
    expect(r3).toBeOk(Cl.uint(2));
  });
});

// ============================================================================
// TEST SUITE 2: Milestone Release
// ============================================================================
describe("Milestone Release", () => {

  it("buyer successfully releases 25% milestone to seller", () => {
    mintSbtc(buyer, ONE_SBTC);
    createStandardEscrow();

    const { result } = simnet.callPublicFn(
      escrowContract, "release-milestone",
      [Cl.uint(0), Cl.uint(25), Cl.contractPrincipal(deployer, "mock-sbtc")], buyer
    );
    const expected25 = ONE_SBTC / 4; // 25,000,000 sats
    expect(result).toBeOk(Cl.uint(expected25));

    // Seller should have received 25%.
    const sellerBal = simnet.callReadOnlyFn(
      "mock-sbtc", "get-balance", [Cl.principal(seller)], deployer
    );
    expect(sellerBal.result).toBeOk(Cl.uint(expected25));

    // Remaining balance in escrow = 75%.
    const remaining = simnet.callReadOnlyFn(
      escrowContract, "get-remaining-balance", [Cl.uint(0)], deployer
    );
    expect(remaining.result).toBeOk(Cl.uint(ONE_SBTC - expected25));
  });

  it("buyer releases 25% then 50% (incremental delta transfer)", () => {
    mintSbtc(buyer, ONE_SBTC);
    createStandardEscrow();

    // First: release 25%.
    simnet.callPublicFn(escrowContract, "release-milestone",
      [Cl.uint(0), Cl.uint(25), Cl.contractPrincipal(deployer, "mock-sbtc")], buyer);

    // Second: release 50% total -> delta = 50% - 25% = 25%.
    const { result } = simnet.callPublicFn(
      escrowContract, "release-milestone",
      [Cl.uint(0), Cl.uint(50), Cl.contractPrincipal(deployer, "mock-sbtc")], buyer
    );
    const delta = (ONE_SBTC / 2) - (ONE_SBTC / 4);
    expect(result).toBeOk(Cl.uint(delta));

    // Seller total = 50%.
    const sellerBal = simnet.callReadOnlyFn(
      "mock-sbtc", "get-balance", [Cl.principal(seller)], deployer
    );
    expect(sellerBal.result).toBeOk(Cl.uint(ONE_SBTC / 2));
  });

  it("releasing 100% milestone marks escrow as completed (state u3)", () => {
    mintSbtc(buyer, ONE_SBTC);
    createStandardEscrow();

    simnet.callPublicFn(escrowContract, "release-milestone",
      [Cl.uint(0), Cl.uint(100), Cl.contractPrincipal(deployer, "mock-sbtc")], buyer);

    // Remaining balance should be 0.
    const remaining = simnet.callReadOnlyFn(
      escrowContract, "get-remaining-balance", [Cl.uint(0)], deployer
    );
    expect(remaining.result).toBeOk(Cl.uint(0));

    // Seller should hold the full amount.
    const sellerBal = simnet.callReadOnlyFn(
      "mock-sbtc", "get-balance", [Cl.principal(seller)], deployer
    );
    expect(sellerBal.result).toBeOk(Cl.uint(ONE_SBTC));

    // Trying to release again should fail (state is COMPLETED, not ACTIVE).
    const { result } = simnet.callPublicFn(
      escrowContract, "release-milestone",
      [Cl.uint(0), Cl.uint(25), Cl.contractPrincipal(deployer, "mock-sbtc")], buyer
    );
    expect(result).toBeErr(Cl.uint(1005)); // ERR-ESCROW-NOT-ACTIVE
  });

  it("rejects invalid milestone percentage (e.g., 30%)", () => {
    mintSbtc(buyer, ONE_SBTC);
    createStandardEscrow();

    const { result } = simnet.callPublicFn(
      escrowContract, "release-milestone",
      [Cl.uint(0), Cl.uint(30), Cl.contractPrincipal(deployer, "mock-sbtc")], buyer
    );
    expect(result).toBeErr(Cl.uint(1004)); // ERR-INVALID-MILESTONE
  });
});

// ============================================================================
// TEST SUITE 3: Security - Unauthorized Access Prevention
// ============================================================================
describe("Security - Unauthorized Access", () => {

  it("prevents non-buyer from releasing milestones", () => {
    mintSbtc(buyer, ONE_SBTC);
    createStandardEscrow();

    const { result } = simnet.callPublicFn(
      escrowContract, "release-milestone",
      [Cl.uint(0), Cl.uint(25), Cl.contractPrincipal(deployer, "mock-sbtc")], outsider
    );
    expect(result).toBeErr(Cl.uint(1000)); // ERR-NOT-AUTHORIZED
  });

  it("prevents seller from releasing milestones", () => {
    mintSbtc(buyer, ONE_SBTC);
    createStandardEscrow();

    const { result } = simnet.callPublicFn(
      escrowContract, "release-milestone",
      [Cl.uint(0), Cl.uint(25), Cl.contractPrincipal(deployer, "mock-sbtc")], seller
    );
    expect(result).toBeErr(Cl.uint(1000));
  });

  it("prevents outsider from initiating a dispute", () => {
    mintSbtc(buyer, ONE_SBTC);
    createStandardEscrow();

    const { result } = simnet.callPublicFn(
      escrowContract, "initiate-dispute",
      [Cl.uint(0)], outsider
    );
    expect(result).toBeErr(Cl.uint(1000));
  });

  it("prevents non-arbiter from resolving a dispute", () => {
    mintSbtc(buyer, ONE_SBTC);
    createStandardEscrow();
    simnet.callPublicFn(escrowContract, "initiate-dispute", [Cl.uint(0)], buyer);

    const { result } = simnet.callPublicFn(
      escrowContract, "resolve-dispute",
      [Cl.uint(0), Cl.uint(50), Cl.contractPrincipal(deployer, "mock-sbtc")], outsider
    );
    expect(result).toBeErr(Cl.uint(1000));
  });

  it("prevents milestone release on a disputed escrow", () => {
    mintSbtc(buyer, ONE_SBTC);
    createStandardEscrow();
    simnet.callPublicFn(escrowContract, "initiate-dispute", [Cl.uint(0)], buyer);

    const { result } = simnet.callPublicFn(
      escrowContract, "release-milestone",
      [Cl.uint(0), Cl.uint(25), Cl.contractPrincipal(deployer, "mock-sbtc")], buyer
    );
    expect(result).toBeErr(Cl.uint(1005)); // ERR-ESCROW-NOT-ACTIVE
  });
});

// ============================================================================
// TEST SUITE 4: Dispute Resolution
// ============================================================================
describe("Dispute Resolution", () => {

  it("buyer can initiate a dispute on an active escrow", () => {
    mintSbtc(buyer, ONE_SBTC);
    createStandardEscrow();

    const { result } = simnet.callPublicFn(
      escrowContract, "initiate-dispute", [Cl.uint(0)], buyer
    );
    expect(result).toBeOk(Cl.bool(true));

    // Milestone release should now fail (escrow is frozen).
    const { result: releaseResult } = simnet.callPublicFn(
      escrowContract, "release-milestone",
      [Cl.uint(0), Cl.uint(25), Cl.contractPrincipal(deployer, "mock-sbtc")], buyer
    );
    expect(releaseResult).toBeErr(Cl.uint(1005));
  });

  it("seller can also initiate a dispute", () => {
    mintSbtc(buyer, ONE_SBTC);
    createStandardEscrow();

    const { result } = simnet.callPublicFn(
      escrowContract, "initiate-dispute", [Cl.uint(0)], seller
    );
    expect(result).toBeOk(Cl.bool(true));
  });

  it("arbiter resolves dispute: 100% to seller", () => {
    mintSbtc(buyer, ONE_SBTC);
    createStandardEscrow();
    simnet.callPublicFn(escrowContract, "initiate-dispute", [Cl.uint(0)], buyer);

    const { result } = simnet.callPublicFn(
      escrowContract, "resolve-dispute",
      [Cl.uint(0), Cl.uint(100), Cl.contractPrincipal(deployer, "mock-sbtc")], deployer
    );
    expect(result).toBeOk(Cl.bool(true));

    const sellerBal = simnet.callReadOnlyFn(
      "mock-sbtc", "get-balance", [Cl.principal(seller)], deployer
    );
    expect(sellerBal.result).toBeOk(Cl.uint(ONE_SBTC));
  });

  it("arbiter resolves dispute: 0% to seller (full refund to buyer)", () => {
    mintSbtc(buyer, ONE_SBTC);
    createStandardEscrow();
    simnet.callPublicFn(escrowContract, "initiate-dispute", [Cl.uint(0)], buyer);

    const { result } = simnet.callPublicFn(
      escrowContract, "resolve-dispute",
      [Cl.uint(0), Cl.uint(0), Cl.contractPrincipal(deployer, "mock-sbtc")], deployer
    );
    expect(result).toBeOk(Cl.bool(true));

    const buyerBal = simnet.callReadOnlyFn(
      "mock-sbtc", "get-balance", [Cl.principal(buyer)], deployer
    );
    expect(buyerBal.result).toBeOk(Cl.uint(ONE_SBTC));
  });
});

// ============================================================================
// TEST SUITE 5: Read-Only Functions
// ============================================================================
describe("Read-Only Functions", () => {

  it("get-escrow-count returns correct count", () => {
    const { result } = simnet.callReadOnlyFn(
      escrowContract, "get-escrow-count", [], deployer
    );
    expect(result).toBeOk(Cl.uint(0));
  });

  it("get-remaining-balance returns correct value after partial release", () => {
    mintSbtc(buyer, ONE_SBTC);
    createStandardEscrow();
    simnet.callPublicFn(escrowContract, "release-milestone",
      [Cl.uint(0), Cl.uint(25), Cl.contractPrincipal(deployer, "mock-sbtc")], buyer);

    const { result } = simnet.callReadOnlyFn(
      escrowContract, "get-remaining-balance", [Cl.uint(0)], deployer
    );
    expect(result).toBeOk(Cl.uint(ONE_SBTC - ONE_SBTC / 4));
  });

  it("get-escrow returns none for non-existent escrow", () => {
    const { result } = simnet.callReadOnlyFn(
      escrowContract, "get-escrow", [Cl.uint(999)], deployer
    );
    expect(result).toBeNone();
  });
});
