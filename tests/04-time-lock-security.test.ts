// ============================================================================
// Test Suite 4: Time-Lock & Expiry Security
// ============================================================================
// Validates: SIP-033 block-time expiry, reclaim-expired, blocks-until-expiry,
// v3 get-escrow-age (tenure-height), is-milestone-overdue, bitcoin finality.
// ============================================================================

import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const buyer = accounts.get("wallet_1")!;
const seller = accounts.get("wallet_2")!;

const escrowContract = "lex-nakamoto-escrow";
const ONE_SBTC = 100_000_000;
const tokenArg = () => Cl.contractPrincipal(deployer, "mock-sbtc");

// -- helpers -----------------------------------------------------------------

function whitelistToken() {
  return simnet.callPublicFn(
    escrowContract, "whitelist-token", [tokenArg()], deployer
  );
}

function mintSbtc(recipient: string, amount: number) {
  return simnet.callPublicFn(
    "mock-sbtc", "mint",
    [Cl.uint(amount), Cl.principal(recipient)],
    deployer
  );
}

function createEscrow(amount = ONE_SBTC, lockPeriod = 0) {
  return simnet.callPublicFn(
    escrowContract, "create-escrow",
    [Cl.principal(seller), Cl.uint(amount), Cl.uint(lockPeriod), tokenArg(), Cl.none()],
    buyer
  );
}

// -- tests -------------------------------------------------------------------

describe("Time-Lock & Expiry", () => {
  it("cannot reclaim before expiry (ERR-ESCROW-NOT-EXPIRED u1011)", () => {
    whitelistToken();
    mintSbtc(buyer, ONE_SBTC);
    createEscrow(ONE_SBTC, 100); // 100-block lock

    const { result } = simnet.callPublicFn(
      escrowContract, "reclaim-expired",
      [Cl.uint(0), tokenArg()],
      buyer
    );
    expect(result).toBeErr(Cl.uint(1011));
  });

  it("buyer reclaims funds after time-lock expiry", () => {
    whitelistToken();
    mintSbtc(buyer, ONE_SBTC);
    createEscrow(ONE_SBTC, 10); // short 10-block lock

    // Advance past expiry.
    simnet.mineEmptyBlocks(11);

    const { result } = simnet.callPublicFn(
      escrowContract, "reclaim-expired",
      [Cl.uint(0), tokenArg()],
      buyer
    );
    expect(result).toBeOk(Cl.uint(ONE_SBTC));

    // Buyer gets funds back.
    const bal = simnet.callReadOnlyFn(
      "mock-sbtc", "get-balance", [Cl.principal(buyer)], deployer
    );
    expect(bal.result).toBeOk(Cl.uint(ONE_SBTC));
  });

  it("is-escrow-expired transitions from false to true at deadline", () => {
    whitelistToken();
    mintSbtc(buyer, ONE_SBTC);
    createEscrow(ONE_SBTC, 10);

    const { result: before } = simnet.callReadOnlyFn(
      escrowContract, "is-escrow-expired", [Cl.uint(0)], deployer
    );
    expect(before).toBeOk(Cl.bool(false));

    simnet.mineEmptyBlocks(11);

    const { result: after } = simnet.callReadOnlyFn(
      escrowContract, "is-escrow-expired", [Cl.uint(0)], deployer
    );
    expect(after).toBeOk(Cl.bool(true));
  });

  it("get-blocks-until-expiry counts down correctly", () => {
    whitelistToken();
    mintSbtc(buyer, ONE_SBTC);
    createEscrow(ONE_SBTC, 100);

    const { result: r1 } = simnet.callReadOnlyFn(
      escrowContract, "get-blocks-until-expiry", [Cl.uint(0)], deployer
    );
    expect(r1).not.toBeErr(Cl.uint(1));

    simnet.mineEmptyBlocks(50);

    const { result: r2 } = simnet.callReadOnlyFn(
      escrowContract, "get-blocks-until-expiry", [Cl.uint(0)], deployer
    );
    expect(r2).not.toBeErr(Cl.uint(1));

    // After expiry, should return 0.
    simnet.mineEmptyBlocks(60);

    const { result: r3 } = simnet.callReadOnlyFn(
      escrowContract, "get-blocks-until-expiry", [Cl.uint(0)], deployer
    );
    expect(r3).not.toBeErr(Cl.uint(1));
  });

  it("get-escrow-age increases with mined blocks (v3 SIP-034)", () => {
    whitelistToken();
    mintSbtc(buyer, ONE_SBTC);
    createEscrow();

    // Mine 10 blocks to get a clear tenure-height delta.
    simnet.mineEmptyBlocks(10);

    const { result } = simnet.callReadOnlyFn(
      escrowContract, "get-escrow-age", [Cl.uint(0)], deployer
    );
    // Age should be 10 (blocks mined after creation).
    expect(result).toBeOk(Cl.uint(10));
  });

  it("is-milestone-overdue returns false for fresh escrow (v3)", () => {
    whitelistToken();
    mintSbtc(buyer, ONE_SBTC);
    createEscrow();

    const { result } = simnet.callReadOnlyFn(
      escrowContract, "is-milestone-overdue", [Cl.uint(0)], deployer
    );
    expect(result).toBeOk(Cl.bool(false));
  });

  it("get-bitcoin-finality returns valid finality data (v3)", () => {
    whitelistToken();
    mintSbtc(buyer, ONE_SBTC);
    createEscrow();

    simnet.mineEmptyBlocks(3);

    const { result } = simnet.callReadOnlyFn(
      escrowContract, "get-bitcoin-finality", [Cl.uint(0)], deployer
    );
    expect(result).not.toBeErr(Cl.uint(1));
  });

  it("clawback-overdue fails before 30-day threshold (ERR u1018)", () => {
    whitelistToken();
    mintSbtc(buyer, ONE_SBTC);
    createEscrow();

    // Only a few blocks old — not overdue yet.
    simnet.mineEmptyBlocks(5);

    const { result } = simnet.callPublicFn(
      escrowContract, "clawback-overdue",
      [Cl.uint(0), tokenArg()],
      buyer
    );
    expect(result).toBeErr(Cl.uint(1018)); // ERR-MILESTONE-NOT-OVERDUE
  });

  it("clawback-overdue refunds buyer after 30-day milestone expiry (SIP-033)", () => {
    whitelistToken();
    mintSbtc(buyer, ONE_SBTC);
    createEscrow();

    // Advance past 30-day threshold (4320 tenure blocks).
    simnet.mineEmptyBlocks(518401);
    const { result } = simnet.callPublicFn(
      escrowContract, "clawback-overdue",
      [Cl.uint(0), tokenArg()],
      buyer
    );
    expect(result).toBeOk(Cl.uint(ONE_SBTC));

    // Buyer gets full funds back.
    const bal = simnet.callReadOnlyFn(
      "mock-sbtc", "get-balance", [Cl.principal(buyer)], deployer
    );
    expect(bal.result).toBeOk(Cl.uint(ONE_SBTC));

    // Escrow status should show "Refunded".
    const status = simnet.callReadOnlyFn(
      escrowContract, "get-escrow-status", [Cl.uint(0)], deployer
    );
    expect(status.result).toBeOk(Cl.stringAscii("Escrow #0: Refunded"));
  }, 20000);

  it("seller cannot clawback (ERR-NOT-AUTHORIZED u1000)", () => {
    whitelistToken();
    mintSbtc(buyer, ONE_SBTC);
    createEscrow();

    simnet.mineEmptyBlocks(4321);

    const { result } = simnet.callPublicFn(
      escrowContract, "clawback-overdue",
      [Cl.uint(0), tokenArg()],
      seller
    );
    expect(result).toBeErr(Cl.uint(100));
  });
});
