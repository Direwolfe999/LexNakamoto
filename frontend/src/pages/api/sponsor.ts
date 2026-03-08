import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const backendUrl = process.env.BACKEND_API_URL;

  // Proxy mode for full sponsor signing + broadcast.
  // Expected body: { txHex: string, principal?: string }
  if (backendUrl && req.body?.txHex) {
    try {
      const r = await fetch(`${backendUrl}/api/sponsor`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(req.body),
      });
      const payload = await r.json().catch(() => ({}));
      return res.status(r.status).json(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sponsor backend unavailable";
      return res.status(502).json({ success: false, error: message });
    }
  }

  // Backend signing integration point for sponsored txs.
  // Set these env vars when sponsor infra is ready:
  // - SPONSOR_ADDRESS
  // - SPONSORED_FEE (optional, microstx)
  const sponsorAddress = process.env.SPONSOR_ADDRESS;
  const feeRaw = process.env.SPONSORED_FEE;

  if (!sponsorAddress) {
    return res.status(204).end();
  }

  const fee = feeRaw ? Number(feeRaw) : undefined;
  return res.status(200).json({ sponsorAddress, ...(fee ? { fee } : {}) });
}
