// ============================================================================
// Test Suite 2: Milestone Release
// ============================================================================
// Validates: 25/50/100% releases, incremental delta transfers, double-release
// prevention, completion state transition, invalid milestones, auth checks.
// ============================================================================

import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const buyer    = accounts.get("wallet_1")!;
const seller   = accounts.get("wallet_2")!;
const outsider = accounts.get("wallet_3")!;

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

function releaseMilestone(id: number, pct: number, sender = buyer) {
  return simnet.callPublicFn(
    escrowContract, "release-milestone",
    [Cl.uint(id), Cl.uint(pct), tokenArg()],
    sender
  );
}

// -- tests -------------------------------------------------------------------

describe("Milestone Release", () => {
  it("releases 25 % milestone to seller", () => {
    whitelistToken();
    mintSbtc(buyer, ONE_SBTC);
    createEscrow();

    const { result } = releaseMilestone(0, 25);
    const expected25 = ONE_SBTC / 4;
    expect(result).toBeOk(Cl.uint(expected25));

    const sellerBal = simnet.callReadOnlyFn(
      "mock-sbtc", "get-balance", [Cl.principal(seller)], deployer
    );
    expect(sellerBal.result).toBeOk(Cl.uint(expected25));

    const remaining = simnet.callReadOnlyFn(
      escrowContract, "get-remaining-balance", [Cl.uint(0)], deployer
    );
    expect(remaining.result).toBeOk(Cl.uint(ONE_SBTC - expected25));
  });

  it("releases 25 % then 50 % (incremental delta)", () => {
    whitelistToken();
    mintSbtc(buyer, ONE_SBTC);
    createEscrow();

    releaseMilestone(0, 25);
    const { result } = releaseMilestone(0, 50);
    const delta = ONE_SBTC / 2 - ONE_SBTC / 4;
    expect(result).toBeOk(Cl.uint(delta));

    const sellerBal = simnet.callReadOnlyFn(
      "mock-sbtc", "get-balance", [Cl.principal(seller)], deployer
    );
    expect(sellerBal.result).toBeOk(Cl.uint(ONE_SBTC / 2));
  });

  it("100 % release completes escrow (state -> COMPLETED)", () => {
    whitelistToken();
    mintSbtc(buyer, ONE_SBTC);
    createEscrow();

    releaseMilestone(0, 100);

    const remaining = simnet.callReadOnlyFn(
      escrowContract, "get-remaining-balance", [Cl.uint(0)], deployer
    );
    expect(remaining.result).toBeOk(Cl.uint(0));

    const sellerBal = simnet.callReadOnlyFn(
      "mock-sbtc", "get-balance", [Cl.principal(seller)], deployer
    );
    expect(sellerBal.result).toBeOk(Cl.uint(ONE_SBTC));
  });

  it("prevents double-release of same milestone (25 % twice -> ERR u1003)", () => {
    whitelistToken();
    mintSbtc(buyer, ONE_SBTC);
    createEscrow();

    releaseMilestone(0, 25);
    const { result } = releaseMilestone(0, 25);
    expect(result).toBeErr(Cl.uint(1003)); // ERR-INVALID-AMOUNT
  });

  it("prevents release after completion (ERR-ESCROW-NOT-ACTIVE u1005)", () => {
    whitelistToken();
    mintSbtc(buyer, ONE_SBTC);
    createEscrow();

    releaseMilestone(0, 100);
    const { result } = releaseMilestone(0, 25);
    expect(result).toBeErr(Cl.uint(1005));
  });

  it("rejects invalid milestone percentage like 30 % (ERR u1004)", () => {
    whitelistToken();
    mintSbtc(buyer, ONE_SBTC);
    createEscrow();

    const { result } = releaseMilestone(0, 30);
    expect(result).toBeErr(Cl.uint(1004));
  });

  it("prevents non-buyer (seller / outsider) from releasing", () => {
    whitelistToken();
    mintSbtc(buyer, ONE_SBTC);
    createEscrow();

    const { result: r1 } = releaseMilestone(0, 25, seller);
    expect(r1).toBeErr(Cl.uint(1000));

    const { result: r2 } = releaseMilestone(0, 25, outsider);
    expect(r2).toBeErr(Cl.uint(1000));
  });
});
