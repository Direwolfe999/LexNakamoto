import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const backendUrl = process.env.BACKEND_API_URL;
  if (!backendUrl) {
    return res.status(200).json({
      ok: true,
      summary: {
        rules: {
          allowedFunctions: ["create-escrow", "release-milestone", "initiate-dispute"],
          allowedTokenContracts: [],
          maxEscrowSats: "100000000",
          maxPerDay: 2,
          cooldownSeconds: 120,
          minSponsorStx: "10",
          warningSponsorStx: "20",
        },
        sponsor: {
          address: "not-configured",
          balanceStx: "0",
          lowGasWarning: true,
          canSponsorNow: false,
        },
      },
      decision: {
        eligible: false,
        reasons: ["BACKEND_API_URL not configured for sponsor policy checks"],
      },
    });
  }

  try {
    if (req.method === "GET") {
      const principal = req.query?.principal ? String(req.query.principal) : "";
      const r = await fetch(`${backendUrl}/api/sponsor/policy${principal ? `?principal=${encodeURIComponent(principal)}` : ""}`);
      const payload = await r.json().catch(() => ({}));
      return res.status(r.status).json(payload);
    }

    if (req.method === "POST") {
      const r = await fetch(`${backendUrl}/api/sponsor/policy/check`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(req.body ?? {}),
      });
      const payload = await r.json().catch(() => ({}));
      return res.status(r.status).json(payload);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sponsor policy backend unavailable";
    return res.status(502).json({ ok: false, error: message });
  }
}
