export class FinalityMonitor {
    apiBase;
    constructor() {
        this.apiBase = process.env.STACKS_API_BASE ?? "https://api.testnet.hiro.so";
    }
    async getTxStatus(txid) {
        const res = await fetch(`${this.apiBase}/extended/v1/tx/${txid}`);
        if (!res.ok) {
            return {
                txid,
                tx_status: "pending",
                status: "pending",
                is_unanchored: true,
                burn_block_height: null,
                canonical: false,
            };
        }
        const tx = (await res.json());
        const txStatus = tx.tx_status ?? "pending";
        const isUnanchored = Boolean(tx.is_unanchored);
        const burnBlockHeight = tx.burn_block_height ?? null;
        const canonical = Boolean(tx.canonical);
        let status = "pending";
        if (txStatus.startsWith("abort"))
            status = "failed";
        else if (txStatus === "success" && isUnanchored)
            status = "fast-path-secure";
        else if (txStatus === "success" && !isUnanchored && burnBlockHeight !== null) {
            status = "bitcoin-anchored-final";
        }
        return {
            txid,
            tx_status: txStatus,
            status,
            is_unanchored: isUnanchored,
            burn_block_height: burnBlockHeight,
            canonical,
        };
    }
}
