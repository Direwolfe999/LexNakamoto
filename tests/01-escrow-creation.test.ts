// ============================================================================
// Test Suite 1: Escrow Creation
// ============================================================================
// Validates: creation flow, balance locking, input validation, whitelist
// enforcement, sequential IDs, and v3 Nakamoto-era field recording.
// ============================================================================

import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const buyer    = accounts.get("wallet_1")!;
const seller   = accounts.get("wallet_2")!;

const escrowContract = "lex-nakamoto-escrow";
const ONE_SBTC = 100_000_000;

// -- helpers -----------------------------------------------------------------

function whitelistToken() {
  return simnet.callPublicFn(
    escrowContract, "whitelist-token",
    [Cl.contractPrincipal(deployer, "mock-sbtc")],
    deployer
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
    [
      Cl.principal(seller),
      Cl.uint(amount),
      Cl.uint(lockPeriod),
      Cl.contractPrincipal(deployer, "mock-sbtc"),
    ],
    buyer
  );
}

// -- tests -------------------------------------------------------------------

describe("Escrow Creation", () => {
  it("creates an escrow and locks sBTC in the contract", () => {
    whitelistToken();
    mintSbtc(buyer, ONE_SBTC);
    const { result } = createEscrow();
    expect(result).toBeOk(Cl.uint(0));

    // Buyer balance should be zero (locked).
    const bal = simnet.callReadOnlyFn(
      "mock-sbtc", "get-balance", [Cl.principal(buyer)], deployer
    );
    expect(bal.result).toBeOk(Cl.uint(0));

    // Remaining balance equals total.
    const rem = simnet.callReadOnlyFn(
      escrowContract, "get-remaining-balance", [Cl.uint(0)], deployer
    );
    expect(rem.result).toBeOk(Cl.uint(ONE_SBTC));
  });

  it("rejects zero-amount escrow (ERR-INVALID-AMOUNT u1003)", () => {
    whitelistToken();
    mintSbtc(buyer, ONE_SBTC);
    const { result } = simnet.callPublicFn(
      escrowContract, "create-escrow",
      [Cl.principal(seller), Cl.uint(0), Cl.uint(0),
       Cl.contractPrincipal(deployer, "mock-sbtc")],
      buyer
    );
    expect(result).toBeErr(Cl.uint(1003));
  });

  it("rejects self-escrow where buyer == seller (ERR-SELF-ESCROW u1013)", () => {
    whitelistToken();
    mintSbtc(buyer, ONE_SBTC);
    const { result } = simnet.callPublicFn(
      escrowContract, "create-escrow",
      [Cl.principal(buyer), Cl.uint(ONE_SBTC), Cl.uint(0),
       Cl.contractPrincipal(deployer, "mock-sbtc")],
      buyer
    );
    expect(result).toBeErr(Cl.uint(1013));
  });

  it("rejects non-whitelisted token (ERR-TOKEN-NOT-WHITELISTED u1017)", () => {
    // Do NOT call whitelistToken — token is not approved.
    mintSbtc(buyer, ONE_SBTC);
    const { result } = createEscrow();
    expect(result).toBeErr(Cl.uint(1017));
  });

  it("increments escrow IDs sequentially (0, 1, 2)", () => {
    whitelistToken();
    mintSbtc(buyer, ONE_SBTC * 3);
    const { result: r0 } = createEscrow(ONE_SBTC);
    const { result: r1 } = createEscrow(ONE_SBTC);
    const { result: r2 } = createEscrow(ONE_SBTC);
    expect(r0).toBeOk(Cl.uint(0));
    expect(r1).toBeOk(Cl.uint(1));
    expect(r2).toBeOk(Cl.uint(2));
  });

  it("records tenure-height and burn-block-height at creation (v3)", () => {
    whitelistToken();
    mintSbtc(buyer, ONE_SBTC);
    createEscrow();

    // Escrow should exist.
    const escrow = simnet.callReadOnlyFn(
      escrowContract, "get-escrow", [Cl.uint(0)], deployer
    );
    expect(escrow.result).not.toBeNone();

    // get-escrow-age should not error (v3 tenure-created field exists).
    const age = simnet.callReadOnlyFn(
      escrowContract, "get-escrow-age", [Cl.uint(0)], deployer
    );
    expect(age.result).not.toBeErr();

    // get-bitcoin-finality should not error (v3 burn-block-created exists).
    const fin = simnet.callReadOnlyFn(
      escrowContract, "get-bitcoin-finality", [Cl.uint(0)], deployer
    );
    expect(fin.result).not.toBeErr();
  });
});
