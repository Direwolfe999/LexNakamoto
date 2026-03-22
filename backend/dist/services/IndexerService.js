import { FinalityMonitor } from "./FinalityMonitor.js";
export class IndexerService {
    monitor;
    watched = new Map();
    constructor(monitor) {
        this.monitor = monitor ?? new FinalityMonitor();
    }
    async watchTransaction(txid, tag) {
        const status = await this.monitor.getTxStatus(txid);
        const item = {
            txid,
            tag,
            lastStatus: status,
            updatedAt: Date.now(),
        };
        this.watched.set(txid, item);
        return item;
    }
    async refreshTransaction(txid) {
        const existing = this.watched.get(txid);
        const status = await this.monitor.getTxStatus(txid);
        const item = {
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
