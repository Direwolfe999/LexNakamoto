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

  constructor(monitor?: FinalityMonitor) {
    this.monitor = monitor ?? new FinalityMonitor();
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

    const item: WatchedTx = {
      txid,
      tag: existing?.tag,
      lastStatus: status,
      updatedAt: Date.now(),
    };

    this.watched.set(txid, item);
    return item;
  }

  listWatched() {
    return Array.from(this.watched.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }
}
