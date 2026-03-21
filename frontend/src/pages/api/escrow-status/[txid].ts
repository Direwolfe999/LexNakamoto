import type { NextApiRequest, NextApiResponse } from "next";
import { API_BASE } from "@/lib/constants";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const txid = String(req.query.txid ?? "");
  if (!txid) return res.status(400).json({ error: "Missing txid" });

  const backendUrl = process.env.BACKEND_API_URL;

  try {
    if (backendUrl) {
      const r = await fetch(`${backendUrl}/api/escrow/status/${txid}`);
      const payload = await r.json().catch(() => ({}));
      return res.status(r.status).json(payload);
    }

    const hiro = await fetch(`${API_BASE}/extended/v1/tx/${txid}`);
    if (!hiro.ok) {
      return res.status(200).json({
        txid,
        tx_status: "pending",
        status: "pending",
        is_unanchored: true,
        burn_block_height: null,
        canonical: false,
      });
    }

    const tx = await hiro.json();
    const txStatus = tx?.tx_status ?? "pending";
    const isUnanchored = Boolean(tx?.is_unanchored);
    const burnBlockHeight = tx?.burn_block_height ?? null;

    let status: "pending" | "fast-path-secure" | "bitcoin-anchored-final" | "failed" = "pending";
    if (String(txStatus).startsWith("abort")) status = "failed";
    else if (txStatus === "success" && isUnanchored) status = "fast-path-secure";
    else if (txStatus === "success" && !isUnanchored && burnBlockHeight !== null) {
      status = "bitcoin-anchored-final";
    }

    return res.status(200).json({
      txid,
      tx_status: txStatus,
      status,
      is_unanchored: isUnanchored,
      burn_block_height: burnBlockHeight,
      canonical: Boolean(tx?.canonical),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Status check failed";
    return res.status(500).json({ error: message });
  }
}
