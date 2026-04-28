/**
 * Aggregate metric snapshot for a specific tenant within a rolling window.
 */
export interface MetricSnapshot {
  tenantId: string;
  streamCreations: number;
  settleAttempts: number;
  timestamp: number;
}

export interface AnomalyThresholds {
  creationBurstLimit: number; // e.g., new streams per hour
  settleRateLimit: number;    // e.g., settle attempts per hour
}

export interface AnomalyAlert {
  tenantId: string;
  ruleName: "STREAM_CREATION_BURST" | "SETTLE_RATE_SPIKE";
  observedValue: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high';
  detectedAt: string;
}