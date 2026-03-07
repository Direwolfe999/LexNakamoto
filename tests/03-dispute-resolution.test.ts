// ============================================================================
// Test Suite 3: Dispute Resolution
// ============================================================================
// Validates: buyer/seller dispute initiation, arbiter resolution at 0/50/100 %,
// outsider rejection, non-dispute resolution rejection, fund distribution.
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

function initiateDispute(id: number, sender: string) {
  return simnet.callPublicFn(
    escrowContract, "initiate-dispute", [Cl.uint(id)], sender
  );
}

function resolveDispute(id: number, pct: number, sender = deployer) {
  return simnet.callPublicFn(
    escrowContract, "resolve-dispute",
    [Cl.uint(id), Cl.uint(pct), tokenArg()],
    sender
  );
}

// -- tests -------------------------------------------------------------------

describe("Dispute Resolution", () => {
  it("buyer initiates dispute and freezes milestone releases", () => {
    whitelistToken();
    mintSbtc(buyer, ONE_SBTC);
    createEscrow();

    const { result } = initiateDispute(0, buyer);
    expect(result).toBeOk(Cl.bool(true));

    // Milestone release should now fail.
    const { result: r } = simnet.callPublicFn(
      escrowContract, "release-milestone",
      [Cl.uint(0), Cl.uint(25), tokenArg()],
      buyer
    );
    expect(r).toBeErr(Cl.uint(1005)); // ERR-ESCROW-NOT-ACTIVE
  });

  it("seller can also initiate a dispute", () => {
    whitelistToken();
    mintSbtc(buyer, ONE_SBTC);
    createEscrow();

    const { result } = initiateDispute(0, seller);
    expect(result).toBeOk(Cl.bool(true));
  });

  it("outsider cannot initiate dispute (ERR-NOT-AUTHORIZED u1000)", () => {
    whitelistToken();
    mintSbtc(buyer, ONE_SBTC);
    createEscrow();

    const { result } = initiateDispute(0, outsider);
    expect(result).toBeErr(Cl.uint(1000));
  });

  it("arbiter resolves dispute: 100 % to seller", () => {
    whitelistToken();
    mintSbtc(buyer, ONE_SBTC);
    createEscrow();
    initiateDispute(0, buyer);

    const { result } = resolveDispute(0, 100);
    expect(result).toBeOk(Cl.bool(true));

    const sellerBal = simnet.callReadOnlyFn(
      "mock-sbtc", "get-balance", [Cl.principal(seller)], deployer
    );
    expect(sellerBal.result).toBeOk(Cl.uint(ONE_SBTC));
  });

  it("arbiter resolves dispute: 0 % to seller (full refund to buyer)", () => {
    whitelistToken();
    mintSbtc(buyer, ONE_SBTC);
    createEscrow();
    initiateDispute(0, buyer);

    const { result } = resolveDispute(0, 0);
    expect(result).toBeOk(Cl.bool(true));

    const buyerBal = simnet.callReadOnlyFn(
      "mock-sbtc", "get-balance", [Cl.principal(buyer)], deployer
    );
    expect(buyerBal.result).toBeOk(Cl.uint(ONE_SBTC));
  });

  it("arbiter resolves dispute: 50/50 split", () => {
    whitelistToken();
    mintSbtc(buyer, ONE_SBTC);
    createEscrow();
    initiateDispute(0, buyer);

    const { result } = resolveDispute(0, 50);
    expect(result).toBeOk(Cl.bool(true));

    const sellerBal = simnet.callReadOnlyFn(
      "mock-sbtc", "get-balance", [Cl.principal(seller)], deployer
    );
    expect(sellerBal.result).toBeOk(Cl.uint(ONE_SBTC / 2));

    const buyerBal = simnet.callReadOnlyFn(
      "mock-sbtc", "get-balance", [Cl.principal(buyer)], deployer
    );
    expect(buyerBal.result).toBeOk(Cl.uint(ONE_SBTC / 2));
  });

  it("non-arbiter cannot resolve dispute (ERR-NOT-AUTHORIZED u1000)", () => {
    whitelistToken();
    mintSbtc(buyer, ONE_SBTC);
    createEscrow();
    initiateDispute(0, buyer);

    const { result } = resolveDispute(0, 50, outsider);
    expect(result).toBeErr(Cl.uint(1000));
  });

  it("cannot resolve a non-disputed escrow (ERR-NOT-IN-DISPUTE u1012)", () => {
    whitelistToken();
    mintSbtc(buyer, ONE_SBTC);
    createEscrow();

    const { result } = resolveDispute(0, 50);
    expect(result).toBeErr(Cl.uint(1012));
  });
});
