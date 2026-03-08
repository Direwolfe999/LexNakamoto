export type DisputeStatus = "open" | "under-review" | "resolved";

export type EvidenceItem = {
  id: string;
  kind: "url" | "note";
  content: string;
  submittedBy: string;
  createdAt: number;
};

export type DisputeRecord = {
  id: string;
  escrowId: number;
  txid?: string;
  openedBy: string;
  reason: string;
  status: DisputeStatus;
  createdAt: number;
  updatedAt: number;
  evidence: EvidenceItem[];
  timeline: Array<{ at: number; note: string }>;
};

export class DisputeService {
  private readonly disputes = new Map<string, DisputeRecord>();

  createDispute(input: { escrowId: number; txid?: string; openedBy: string; reason: string }) {
    const id = `DSP-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const now = Date.now();

    const dispute: DisputeRecord = {
      id,
      escrowId: input.escrowId,
      txid: input.txid,
      openedBy: input.openedBy,
      reason: input.reason,
      status: "open",
      createdAt: now,
      updatedAt: now,
      evidence: [],
      timeline: [{ at: now, note: "Dispute opened" }],
    };

    this.disputes.set(id, dispute);
    return dispute;
  }

  addEvidence(disputeId: string, input: { kind: "url" | "note"; content: string; submittedBy: string }) {
    const dispute = this.disputes.get(disputeId);
    if (!dispute) throw new Error("Dispute not found");

    const ev: EvidenceItem = {
      id: `EV-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      kind: input.kind,
      content: input.content,
      submittedBy: input.submittedBy,
      createdAt: Date.now(),
    };

    dispute.evidence.push(ev);
    dispute.updatedAt = Date.now();
    dispute.timeline.push({ at: dispute.updatedAt, note: `Evidence added by ${input.submittedBy}` });
    this.disputes.set(disputeId, dispute);
    return dispute;
  }

  setStatus(disputeId: string, status: DisputeStatus, note?: string) {
    const dispute = this.disputes.get(disputeId);
    if (!dispute) throw new Error("Dispute not found");

    dispute.status = status;
    dispute.updatedAt = Date.now();
    dispute.timeline.push({ at: dispute.updatedAt, note: note ?? `Status changed to ${status}` });
    this.disputes.set(disputeId, dispute);
    return dispute;
  }

  getDispute(disputeId: string) {
    return this.disputes.get(disputeId) ?? null;
  }

  listDisputes() {
    return Array.from(this.disputes.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }
}
