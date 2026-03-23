import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const buyer    = accounts.get("wallet_1")!;
const seller   = accounts.get("wallet_2")!;

const escrowContract = "lex-nakamoto-escrow";
const ONE_SBTC = 100_000_000;

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

describe("Security - Circuit Breaker Pattern", () => {
    it("Non-owner cannot toggle pause", () => {
        const { result } = simnet.callPublicFn(
            escrowContract, "emergency-toggle",
            [Cl.bool(true)],
            buyer
        );
        expect(result).toBeErr(Cl.uint(100)); // ERR-NOT-AUTHORIZED
    });

    it("Owner can toggle pause and blocked interactions fail with u101", () => {
        whitelistToken();
        mintSbtc(buyer, ONE_SBTC);

        // Owner pauses the contract
        const pauseRes = simnet.callPublicFn(
            escrowContract, "emergency-toggle",
            [Cl.bool(true)],
            deployer
        );
        expect(pauseRes).toBeOk(Cl.bool(true));

        // Create escrow fails
        const createRes = simnet.callPublicFn(
            escrowContract, "create-escrow",
            [
                Cl.principal(seller),
                Cl.uint(ONE_SBTC / 2),
                Cl.uint(100), // lock-period
                Cl.contractPrincipal(deployer, "mock-sbtc"),
                Cl.none()
            ],
            buyer
        );
        expect(createRes).toBeErr(Cl.uint(101)); // ERR-CONTRACT-PAUSED
    });

    it("Contract resumes normal operation when unpaused", () => {
        whitelistToken();
        mintSbtc(buyer, ONE_SBTC);

        // Unpause (should already be false in initial state, but explicit toggle to false)
        const unpauseRes = simnet.callPublicFn(
            escrowContract, "emergency-toggle",
            [Cl.bool(false)],
            deployer
        );
        expect(unpauseRes).toBeOk(Cl.bool(false));

        // Create escrow succeeds
        const createRes = simnet.callPublicFn(
            escrowContract, "create-escrow",
            [
                Cl.principal(seller),
                Cl.uint(ONE_SBTC / 2),
                Cl.uint(100), // lock-period
                Cl.contractPrincipal(deployer, "mock-sbtc"),
                Cl.none()
            ],
            buyer
        );
        // Expecting an ID back
        expect(createRes).toBeOk(Cl.uint(0));
    });
});
