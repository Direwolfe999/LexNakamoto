// ============================================================================
// Test Suite 5: Governance & Admin
// ============================================================================
// Validates: two-step arbiter governance (nominate -> accept), token whitelist
// management, authorization guards, and v3 get-escrow-status with int-to-ascii.
// ============================================================================

import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer   = accounts.get("deployer")!;
const buyer      = accounts.get("wallet_1")!;
const seller     = accounts.get("wallet_2")!;
const outsider   = accounts.get("wallet_3")!;
const newArbiter = accounts.get("wallet_4")!;

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

function createEscrow(amount = ONE_SBTC) {
  return simnet.callPublicFn(
    escrowContract, "create-escrow",
    [Cl.principal(seller), Cl.uint(amount), Cl.uint(0), tokenArg()],
    buyer
  );
}

// -- tests -------------------------------------------------------------------

describe("Governance & Admin", () => {
  it("two-step arbiter governance: nominate then accept", () => {
    const { result: nom } = simnet.callPublicFn(
      escrowContract, "nominate-arbiter",
      [Cl.principal(newArbiter)],
      deployer
    );
    expect(nom).toBeOk(Cl.bool(true));

    // Verify pending arbiter.
    const pending = simnet.callReadOnlyFn(
      escrowContract, "get-pending-arbiter", [], deployer
    );
    expect(pending.result).toBeOk(Cl.some(Cl.principal(newArbiter)));

    // New arbiter accepts.
    const { result: acc } = simnet.callPublicFn(
      escrowContract, "accept-arbiter", [],
      newArbiter
    );
    expect(acc).toBeOk(Cl.bool(true));

    // Confirm new arbiter is active.
    const arbiter = simnet.callReadOnlyFn(
      escrowContract, "get-platform-arbiter", [], deployer
    );
    expect(arbiter.result).toBeOk(Cl.principal(newArbiter));
  });

  it("outsider cannot nominate arbiter (ERR-NOT-AUTHORIZED u1000)", () => {
    const { result } = simnet.callPublicFn(
      escrowContract, "nominate-arbiter",
      [Cl.principal(newArbiter)],
      outsider
    );
    expect(result).toBeErr(Cl.uint(1000));
  });

  it("wrong person cannot accept nomination (ERR-NOT-NOMINATED u1016)", () => {
    simnet.callPublicFn(
      escrowContract, "nominate-arbiter",
      [Cl.principal(newArbiter)],
      deployer
    );
    const { result } = simnet.callPublicFn(
      escrowContract, "accept-arbiter", [],
      outsider
    );
    expect(result).toBeErr(Cl.uint(1016));
  });

  it("whitelist-token allows creation; delist-token blocks it", () => {
    const { result: wl } = whitelistToken();
    expect(wl).toBeOk(Cl.bool(true));

    const { result: check } = simnet.callReadOnlyFn(
      escrowContract, "is-token-whitelisted",
      [Cl.contractPrincipal(deployer, "mock-sbtc")],
      deployer
    );
    expect(check).toBeOk(Cl.bool(true));

    // Delist.
    const { result: dl } = simnet.callPublicFn(
      escrowContract, "delist-token", [tokenArg()], deployer
    );
    expect(dl).toBeOk(Cl.bool(true));

    const { result: check2 } = simnet.callReadOnlyFn(
      escrowContract, "is-token-whitelisted",
      [Cl.contractPrincipal(deployer, "mock-sbtc")],
      deployer
    );
    expect(check2).toBeOk(Cl.bool(false));
  });

  it("outsider cannot whitelist tokens (ERR-NOT-AUTHORIZED u1000)", () => {
    const { result } = simnet.callPublicFn(
      escrowContract, "whitelist-token", [tokenArg()],
      outsider
    );
    expect(result).toBeErr(Cl.uint(1000));
  });

  it("get-escrow-status returns human-readable ASCII via int-to-ascii (v3)", () => {
    whitelistToken();
    mintSbtc(buyer, ONE_SBTC);
    createEscrow();

    const { result } = simnet.callReadOnlyFn(
      escrowContract, "get-escrow-status", [Cl.uint(0)], deployer
    );
    expect(result).toBeOk(Cl.stringAscii("Escrow #0: Active"));
  });

  it("get-escrow-status shows Disputed after dispute initiation (v3)", () => {
    whitelistToken();
    mintSbtc(buyer, ONE_SBTC);
    createEscrow();
    simnet.callPublicFn(
      escrowContract, "initiate-dispute", [Cl.uint(0)], buyer
    );

    const { result } = simnet.callReadOnlyFn(
      escrowContract, "get-escrow-status", [Cl.uint(0)], deployer
    );
    expect(result).toBeOk(Cl.stringAscii("Escrow #0: Disputed"));
  });

  it("get-escrow-status returns error for non-existent escrow", () => {
    const { result } = simnet.callReadOnlyFn(
      escrowContract, "get-escrow-status", [Cl.uint(999)], deployer
    );
    expect(result).toBeErr(Cl.uint(1001));
  });
});
