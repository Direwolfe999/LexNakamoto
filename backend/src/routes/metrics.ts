import { Router, type Request, type Response } from "express";
import { metricsStore } from "../utils/metricsStore.js";

export const metricsRouter = Router();

metricsRouter.get("/api/metrics", (_req: Request, res: Response) => {
  if (process.env.EXPOSE_METRICS !== "true") {
    return res.status(403).json({ error: "Metrics endpoint disabled." });
  }

  res.json({
    ok: true,
    ...metricsStore.getMetrics()
  });
});
