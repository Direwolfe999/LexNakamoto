import { Router, type Request, type Response } from "express";

export const healthRouter = Router();

healthRouter.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    uptimeSec: process.uptime(),
    timestamp: new Date().toISOString()
  });
});
