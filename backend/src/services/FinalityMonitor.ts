export type FinalityState =
  | "pending"
  | "fast-path-secure"
  | "bitcoin-anchored-final"
  | "failed";

export type TxStatusResponse = {
  txid: string;
  tx_status: string;
  status: FinalityState;
  is_unanchored: boolean;
  burn_block_height: number | null;
  canonical: boolean;
};

export class FinalityMonitor {
  private readonly apiBase: string;

  constructor() {
    this.apiBase = process.env.STACKS_API_BASE ?? "https://api.testnet.hiro.so";
  }

  
  // Feature 7: Discord/Slack Webhook Integration
  async notifyWebhook(txid, status) {
    if (process.env.DISCORD_WEBHOOK_URL) {
      try {
        await fetch(process.env.DISCORD_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: `Escrow TX ${txid} reached finality state: ${status}` })
        });
      } catch (e) {
        console.error('Webhook failed', e);
      }
    }
  }

  async getTxStatus(txid: string): Promise<TxStatusResponse> {
    const res = await fetch(`${this.apiBase}/extended/v1/tx/${txid}`);
    if (!res.ok) {
      if (status !== 'pending' && status !== 'failed') {
      this.notifyWebhook(txid, status);
    }

    return {
        txid,
        tx_status: "pending",
        status: "pending",
        is_unanchored: true,
        burn_block_height: null,
        canonical: false,
      };
    }

    const tx = (await res.json()) as {
      tx_status?: string;
      is_unanchored?: boolean;
      burn_block_height?: number | null;
      canonical?: boolean;
    };

    const txStatus = tx.tx_status ?? "pending";
    const isUnanchored = Boolean(tx.is_unanchored);
    const burnBlockHeight = tx.burn_block_height ?? null;
    const canonical = Boolean(tx.canonical);

    let status: FinalityState = "pending";
    if (txStatus.startsWith("abort")) status = "failed";
    else if (txStatus === "success" && isUnanchored) status = "fast-path-secure";
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
