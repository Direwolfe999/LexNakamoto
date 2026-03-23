"use client";

import { useCallback, useState } from "react";
import { openContractCall } from "@stacks/connect";
import { contractPrincipalCV, principalCV, uintCV } from "@stacks/transactions";
import {
  ACTIVE_SBTC_CONTRACT,
  CONTRACT_ADDRESS,
  ESCROW_CONTRACT_NAME,
} from "@/lib/constants";

type CreateEscrowInput = {
  seller: string;
  amountSats: bigint;
  lockPeriod: number;
  principal?: string;
};

export type SponsoredEscrowState =
  | "idle"
  | "prompting-wallet"
  | "sponsoring"
  | "broadcasted"
  | "failed";

export function useSponsoredEscrow() {
  const [state, setState] = useState<SponsoredEscrowState>("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");

  const createEscrowSponsored = useCallback(async (input: CreateEscrowInput) => {
    const [tokenAddress, tokenName] = ACTIVE_SBTC_CONTRACT.split(".");
    const functionArgs = [
      principalCV(input.seller),
      uintCV(input.amountSats),
      uintCV(input.lockPeriod),
      contractPrincipalCV(tokenAddress, tokenName),
    ];

    return new Promise<{ txId: string; mode: "sponsored" | "self-paid" }>((resolve, reject) => {
      const openSelfPaidFlow = () => {
        setStatusMessage("Proceed with self-paid gas in wallet...");
        openContractCall({
          contractAddress: CONTRACT_ADDRESS,
          contractName: ESCROW_CONTRACT_NAME,
          functionName: "create-escrow",
          functionArgs,
          sponsored: false,
          onCancel: () => {
            setState("failed");
            reject(new Error("Self-paid signing cancelled"));
          },
          onFinish: (signed: { txId?: string }) => {
            const txId = signed?.txId;
            if (!txId) {
              setState("failed");
              reject(new Error("Missing txId after self-paid submit"));
              return;
            }
            setState("broadcasted");
            setStatusMessage("Transaction broadcasted");
            resolve({ txId, mode: "self-paid" });
          },
        });
      };

      const startSponsoredFlow = () => {
        setState("prompting-wallet");
        setStatusMessage("Confirm in wallet (sponsored, 0 STX fee)...");

        openContractCall({
          contractAddress: CONTRACT_ADDRESS,
          contractName: ESCROW_CONTRACT_NAME,
          functionName: "create-escrow",
          functionArgs,
          sponsored: true,
          onCancel: () => {
            setState("failed");
            setStatusMessage("Wallet signing cancelled");
            reject(new Error("Wallet signing cancelled"));
          },
          onFinish: async (data: { txRaw?: string }) => {
            try {
              setState("sponsoring");
              setStatusMessage("Sponsoring your transaction...");
              const txHex = data?.txRaw;
              if (!txHex) throw new Error("Missing txRaw from wallet response");

              const sponsorRes = await fetch("/api/sponsor", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ txHex, principal: input.principal }),
              });

              if (!sponsorRes.ok) {
                const payload = await sponsorRes.json().catch(() => ({}));
                const msg = payload?.error ?? "Sponsorship rejected";

                const fallback = window.confirm(
                  `${msg}\n\nWould you like to retry and pay your own gas?`
                );

                if (!fallback) throw new Error(msg);
                openSelfPaidFlow();
                return;
              }

              const out = await sponsorRes.json();
              const txId = String(out?.txid ?? "");
              if (!txId) throw new Error("Sponsor service did not return txid");

              setState("broadcasted");
              setStatusMessage("Sponsored transaction broadcasted");
              resolve({ txId, mode: "sponsored" });
            } catch (err) {
              setState("failed");
              setStatusMessage(err instanceof Error ? err.message : "Sponsorship failed");
              reject(err instanceof Error ? err : new Error("Sponsorship failed"));
            }
          },
        });
      };

      const run = async () => {
        try {
          setStatusMessage("Running sponsor preflight policy checks...");
          const preflight = await fetch("/api/sponsor-policy", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              principal: input.principal,
              functionName: "create-escrow",
              amountSats: input.amountSats.toString(),
              tokenContract: ACTIVE_SBTC_CONTRACT,
            }),
          });

          const payload = await preflight.json().catch(() => ({}));
          const eligible = Boolean(payload?.decision?.eligible);

          if (!preflight.ok) {
            throw new Error(payload?.error ?? "Sponsor preflight failed");
          }

          if (!eligible) {
            const reasons: string[] = Array.isArray(payload?.decision?.reasons)
              ? payload.decision.reasons
              : ["Sponsor policy denied this request"];

            const fallback = window.confirm(
              `Gasless policy blocked this escrow:\n- ${reasons.join("\n- ")}\n\nContinue with self-paid gas?`
            );

            if (!fallback) {
              throw new Error(reasons[0] ?? "Sponsor policy denied this request");
            }

            setState("prompting-wallet");
            openSelfPaidFlow();
            return;
          }

          startSponsoredFlow();
        } catch (error) {
          setState("failed");
          setStatusMessage(error instanceof Error ? error.message : "Preflight failed");
          reject(error instanceof Error ? error : new Error("Preflight failed"));
        }
      };

      void run();
    });
  }, []);

  return { createEscrowSponsored, state, statusMessage };
}
