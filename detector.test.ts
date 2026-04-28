import { AnomalyDetector } from "./detector";
import { MetricSnapshot } from "./types";

describe("AnomalyDetector", () => {
  const tenantId = "tenant_test_1";
  const thresholds = { creationBurstLimit: 10, settleRateLimit: 5 };

  const createSnapshot = (creations: number, settles: number): MetricSnapshot => ({
    tenantId,
    streamCreations: creations,
    settleAttempts: settles,
    timestamp: Date.now(),
  });

  it("passes under normal load", () => {
    const alerts = AnomalyDetector.evaluate(createSnapshot(5, 2), thresholds);
    expect(alerts).toHaveLength(0);
  });

  it("detects stream creation bursts", () => {
    const alerts = AnomalyDetector.evaluate(createSnapshot(15, 2), thresholds);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].ruleName).toBe("STREAM_CREATION_BURST");
    expect(alerts[0].observedValue).toBe(15);
  });

  it("detects settle rate spikes", () => {
    const alerts = AnomalyDetector.evaluate(createSnapshot(5, 10), thresholds);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].ruleName).toBe("SETTLE_RATE_SPIKE");
  });

  it("detects multiple anomalies simultaneously", () => {
    const alerts = AnomalyDetector.evaluate(createSnapshot(20, 20), thresholds);
    expect(alerts).toHaveLength(2);
  });

  it("respects the whitelist/snooze mechanism", () => {
    AnomalyDetector.setWhitelist(tenantId, true);
    const alerts = AnomalyDetector.evaluate(createSnapshot(100, 100), thresholds);
    expect(alerts).toHaveLength(0);
    
    // Cleanup
    AnomalyDetector.setWhitelist(tenantId, false);
  });
});