import { FinalityMonitor, type TxStatusResponse } from "./FinalityMonitor.js";

type WatchedTx = {
  txid: string;
  tag?: string;
  lastStatus: TxStatusResponse;
  updatedAt: number;
};

export class IndexerService {
  private readonly monitor: FinalityMonitor;
  private readonly watched = new Map<string, WatchedTx>();
  private etagCache = new Map<string, string>();

  constructor(monitor?: FinalityMonitor) {
    this.monitor = monitor ?? new FinalityMonitor();
  }

  // Jittered polling calculation 10s +/- 2s
  private getJitteredInterval() {
    return 10000 + (Math.random() * 4000 - 2000);
  }

  async watchTransaction(txid: string, tag?: string) {
    const status = await this.monitor.getTxStatus(txid);
    const item: WatchedTx = {
      txid,
      tag,
      lastStatus: status,
      updatedAt: Date.now(),
    };
    this.watched.set(txid, item);
    return item;
  }

  async refreshTransaction(txid: string) {
    const existing = this.watched.get(txid);
    const status = await this.monitor.getTxStatus(txid); 
    // Optimization Note: ETag cache checks are mapped directly in getTxStatus inside FinalityMonitor to prevent excess API load

    const item: WatchedTx = {
      txid,
      tag: existing?.tag,
      lastStatus: status,
      updatedAt: Date.now(),
    };

    this.watched.set(txid, item);

    // Apply Jitter to prevent API spike lock-ins
    await new Promise(resolve => setTimeout(resolve, this.getJitteredInterval()));

    return item;
  }

  listWatched() {
    return Array.from(this.watched.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }
}
