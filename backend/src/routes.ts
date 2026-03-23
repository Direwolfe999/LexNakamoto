import { Router, type Request, type Response } from "express";
import { DisputeService } from "./services/DisputeService.js";
import { FinalityMonitor } from "./services/FinalityMonitor.js";
import { IndexerService } from "./services/IndexerService.js";
import { NotificationService } from "./services/NotificationService.js";
import { SponsorService } from "./services/SponsorService.js";
import { sponsorRateLimiter } from "./middleware/rateLimiter.js";
import { healthRouter } from "./routes/health.js";
import { metricsRouter } from "./routes/metrics.js";
import { metricsStore } from "./utils/metricsStore.js";

const router = Router();
router.use(healthRouter);
router.use(metricsRouter);

const sponsorService = new SponsorService();
const finalityMonitor = new FinalityMonitor();
const indexerService = new IndexerService(finalityMonitor);
const disputeService = new DisputeService();
const notificationService = new NotificationService();

router.get("/health", (_req: Request, res: Response) => {
  res.json({ ok: true, service: "lex-nakamoto-backend" });
});

router.post("/api/sponsor", sponsorRateLimiter, async (req: Request, res: Response) => {
  try {
    const txHex = String(req.body?.txHex ?? "");
    const principal = req.body?.principal ? String(req.body.principal) : undefined;
    if (!txHex) {
      return res.status(400).json({ success: false, error: "txHex is required" });
    }

    const out = await sponsorService.sponsorAndBroadcast({
      txHex,
      principal,
      ip: req.ip ?? "unknown",
    });

    metricsStore.incrementSponsoredTx();

    await notificationService.dispatch("escrow.sponsored", {
      txid: out.txid,
      principal,
    });

    return res.json({ success: true, ...out });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sponsor failed";
    return res.status(400).json({ success: false, error: message });
  }
});

router.get("/api/sponsor/policy", async (req: Request, res: Response) => {
  try {
    const summary = await sponsorService.getPolicySummary();
    const principal = req.query?.principal ? String(req.query.principal) : undefined;
    const decision = await sponsorService.evaluatePolicy({ principal });
    return res.json({ ok: true, summary, decision });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load sponsor policy";
    return res.status(500).json({ ok: false, error: message });
  }
});

router.post("/api/sponsor/policy/check", async (req: Request, res: Response) => {
  try {
    const principal = req.body?.principal ? String(req.body.principal) : undefined;
    const functionName = req.body?.functionName ? String(req.body.functionName) : undefined;
    const amountSats = req.body?.amountSats ? String(req.body.amountSats) : undefined;
    const tokenContract = req.body?.tokenContract ? String(req.body.tokenContract) : undefined;

    const decision = await sponsorService.evaluatePolicy({
      principal,
      functionName,
      amountSats,
      tokenContract,
    });

    return res.json({ ok: true, decision });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sponsor policy check failed";
    return res.status(400).json({ ok: false, error: message });
  }
});

router.get("/api/escrow/status/:txid", async (req: Request, res: Response) => {
  try {
    const txid = Array.isArray(req.params.txid) ? req.params.txid[0] : req.params.txid;
    const status = await finalityMonitor.getTxStatus(txid);
    return res.json(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Status check failed";
    return res.status(500).json({ error: message });
  }
});

router.post("/api/indexer/watch", async (req: Request, res: Response) => {
  try {
    const txid = String(req.body?.txid ?? "");
    const tag = req.body?.tag ? String(req.body.tag) : undefined;
    if (!txid) return res.status(400).json({ error: "txid is required" });

    const watched = await indexerService.watchTransaction(txid, tag);
    return res.json({ ok: true, watched });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Indexer watch failed";
    return res.status(400).json({ error: message });
  }
});

router.get("/api/indexer/tx/:txid", async (req: Request, res: Response) => {
  try {
    const txid = Array.isArray(req.params.txid) ? req.params.txid[0] : req.params.txid;
    const watched = await indexerService.refreshTransaction(txid);
    return res.json({ ok: true, watched });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Indexer refresh failed";
    return res.status(400).json({ error: message });
  }
});

router.get("/api/indexer/watched", (_req: Request, res: Response) => {
  return res.json({ ok: true, items: indexerService.listWatched() });
});

router.post("/api/disputes", async (req: Request, res: Response) => {
  try {
    const escrowId = Number(req.body?.escrowId ?? NaN);
    const txid = req.body?.txid ? String(req.body.txid) : undefined;
    const openedBy = String(req.body?.openedBy ?? "");
    const reason = String(req.body?.reason ?? "");

    if (!Number.isFinite(escrowId)) return res.status(400).json({ error: "escrowId is required" });
    if (!openedBy || !reason) return res.status(400).json({ error: "openedBy and reason are required" });

    const dispute = disputeService.createDispute({ escrowId, txid, openedBy, reason });
    await notificationService.dispatch("dispute.opened", {
      disputeId: dispute.id,
      escrowId,
      openedBy,
    });

    return res.status(201).json({ ok: true, dispute });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Create dispute failed";
    return res.status(400).json({ error: message });
  }
});

router.post("/api/disputes/:id/evidence", async (req: Request, res: Response) => {
  try {
    const disputeId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const kind = req.body?.kind === "url" ? "url" : "note";
    const content = String(req.body?.content ?? "");
    const submittedBy = String(req.body?.submittedBy ?? "");

    if (!content || !submittedBy) return res.status(400).json({ error: "content and submittedBy are required" });

    const dispute = disputeService.addEvidence(disputeId, { kind, content, submittedBy });
    await notificationService.dispatch("dispute.evidence_added", {
      disputeId,
      submittedBy,
      kind,
    });

    return res.json({ ok: true, dispute });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Add evidence failed";
    return res.status(400).json({ error: message });
  }
});

router.patch("/api/disputes/:id/status", async (req: Request, res: Response) => {
  try {
    const disputeId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const statusRaw = String(req.body?.status ?? "");
    const note = req.body?.note ? String(req.body.note) : undefined;
    if (!["open", "under-review", "resolved"].includes(statusRaw)) {
      return res.status(400).json({ error: "status must be open | under-review | resolved" });
    }

    const dispute = disputeService.setStatus(disputeId, statusRaw as "open" | "under-review" | "resolved", note);
    await notificationService.dispatch("dispute.status_changed", {
      disputeId,
      status: statusRaw,
    });

    return res.json({ ok: true, dispute });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update dispute status failed";
    return res.status(400).json({ error: message });
  }
});

router.get("/api/disputes", (_req: Request, res: Response) => {
  return res.json({ ok: true, items: disputeService.listDisputes() });
});

router.get("/api/disputes/:id", (req: Request, res: Response) => {
  const disputeId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const dispute = disputeService.getDispute(disputeId);
  if (!dispute) return res.status(404).json({ error: "Dispute not found" });
  return res.json({ ok: true, dispute });
});

router.post("/api/notifications/subscribers", (req: Request, res: Response) => {
  const channel = req.body?.channel;
  const target = String(req.body?.target ?? "");
  if (!["webhook", "email", "telegram"].includes(String(channel))) {
    return res.status(400).json({ error: "channel must be webhook | email | telegram" });
  }
  if (!target) return res.status(400).json({ error: "target is required" });

  const subscriber = notificationService.addSubscriber({
    channel: channel as "webhook" | "email" | "telegram",
    target,
  });

  return res.status(201).json({ ok: true, subscriber });
});

router.get("/api/notifications/subscribers", (_req: Request, res: Response) => {
  return res.json({ ok: true, items: notificationService.listSubscribers() });
});

router.post("/api/notifications/test", async (req: Request, res: Response) => {
  const event = String(req.body?.event ?? "system.test");
  const payload = typeof req.body?.payload === "object" && req.body?.payload !== null
    ? req.body.payload as Record<string, unknown>
    : {};

  const result = await notificationService.dispatch(event, payload);
  return res.json({ ok: true, ...result });
});

router.get("/api/notifications/events", (_req: Request, res: Response) => {
  return res.json({ ok: true, items: notificationService.recentEvents() });
});

export default router;
