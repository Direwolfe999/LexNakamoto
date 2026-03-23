class MetricsStore {
  private totalSponsoredTx = 0;
  private serverStartTime = Date.now();
  private lastSponsoredAt: Date | null = null;

  incrementSponsoredTx() {
    this.totalSponsoredTx++;
    this.lastSponsoredAt = new Date();
  }

  getMetrics() {
    return {
      totalSponsoredTx: this.totalSponsoredTx,
      serverUptimeSec: Math.floor((Date.now() - this.serverStartTime) / 1000),
      lastSponsoredAt: this.lastSponsoredAt,
    };
  }
}

export const metricsStore = new MetricsStore();
