export class DisputeService {
    disputes = new Map();
    createDispute(input) {
        const id = `DSP-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        const now = Date.now();
        const dispute = {
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
    addEvidence(disputeId, input) {
        const dispute = this.disputes.get(disputeId);
        if (!dispute)
            throw new Error("Dispute not found");
        const ev = {
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
    setStatus(disputeId, status, note) {
        const dispute = this.disputes.get(disputeId);
        if (!dispute)
            throw new Error("Dispute not found");
        dispute.status = status;
        dispute.updatedAt = Date.now();
        dispute.timeline.push({ at: dispute.updatedAt, note: note ?? `Status changed to ${status}` });
        this.disputes.set(disputeId, dispute);
        return dispute;
    }
    getDispute(disputeId) {
        return this.disputes.get(disputeId) ?? null;
    }
    listDisputes() {
        return Array.from(this.disputes.values()).sort((a, b) => b.updatedAt - a.updatedAt);
    }
}
