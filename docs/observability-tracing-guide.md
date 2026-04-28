# Observability and Tracing Guide

This guide explains how to trace failed requests and debug issues using the structured logging and correlation propagation system implemented in StreamPay.

## Overview

The StreamPay frontend implements end-to-end correlation propagation using:
- **request_id**: Unique identifier for each HTTP request
- **correlation_id**: Propagated across all async operations for a single business transaction
- **traceparent**: Optional W3C trace context for distributed tracing
- **stream_id**: Stream identifier when applicable
- **job_id**: Job identifier for async operations
- **stellar_tx_hash**: Stellar transaction hash for chain submissions

All logs are structured JSON with consistent fields for easy querying in log aggregation systems like Datadog, ELK, or CloudWatch.

## Log Structure

Every log entry includes:

```json
{
  "level": "info|warn|error|debug",
  "message": "Human-readable message",
  "timestamp": "2026-04-28T10:30:00.000Z",
  "service": "streampay-frontend",
  "environment": "development|production",
  "request_id": "uuid-v4",
  "correlation_id": "uuid-v4",
  "stream_id": "stream-abc123 (when applicable)",
  "job_id": "job-xyz (when applicable)",
  "stellar_tx_hash": "tx-hash (when applicable)",
  "webhook_id": "webhook-id (when applicable)",
  "retry_count": 3 (when applicable)",
  "queue_name": "settlement-queue (when applicable)",
  "traceparent": "00-... (when applicable)",
  "...": "additional context fields"
}
```

## How to Trace a Failed Settlement

### Step 1: Identify the Failure

When a user reports a failed settlement, gather:
- Stream ID (if known)
- Approximate time of failure
- Error message (if available)

### Step 2: Search Logs by Correlation ID

If you have a correlation ID from the error response:

```bash
# Datadog
correlation_id:"abc-123-def-456"

# ELK / Kibana
correlation_id: "abc-123-def-456"

# CloudWatch Logs Insights
fields @message
| filter correlation_id = 'abc-123-def-456'
| sort @timestamp desc
```

### Step 3: Search by Stream ID

If you only have the stream ID:

```bash
# Datadog
stream_id:"stream-ada123"

# ELK / Kibana
stream_id: "stream-ada123"

# CloudWatch Logs Insights
fields @message
| filter stream_id = 'stream-ada123'
| sort @timestamp desc
```

### Step 4: Search by Stellar Transaction Hash

If a transaction was submitted but failed:

```bash
# Datadog
stellar_tx_hash:"fake-tx-abc123"

# ELK / Kibana
stellar_tx_hash: "fake-tx-abc123"

# CloudWatch Logs Insights
fields @message
| filter stellar_tx_hash = 'fake-tx-abc123'
| sort @timestamp desc
```

### Step 5: Follow the Trace

Once you find the initial log entry, use the `correlation_id` to trace the entire request flow:

```bash
# Get all logs for a single correlation
correlation_id:"abc-123-def-456" | sort @timestamp asc
```

This will show you:
1. Initial API request
2. Stream state validation
3. Transaction submission
4. Any retries
5. Final outcome

## Example Log Flows

### Before: Unstructured Logs

```
[2026-04-28 10:30:00] Stream settled
[2026-04-28 10:30:01] Transaction submitted
[2026-04-28 10:30:02] Error: transaction failed
```

**Problems:**
- No correlation between logs
- No request context
- Hard to trace across services
- No structured fields for filtering

### After: Structured Logs with Correlation

```json
{"level":"info","message":"Incoming request","timestamp":"2026-04-28T10:30:00.000Z","service":"streampay-frontend","environment":"production","request_id":"req-abc123","correlation_id":"corr-def456","method":"POST","url":"/api/streams/stream-ada/settle"}

{"level":"info","message":"Settlement request received","timestamp":"2026-04-28T10:30:00.100Z","service":"streampay-frontend","environment":"production","request_id":"req-abc123","correlation_id":"corr-def456","stream_id":"stream-ada"}

{"level":"info","message":"Settlement transaction submitted","timestamp":"2026-04-28T10:30:01.000Z","service":"streampay-frontend","environment":"production","request_id":"req-abc123","correlation_id":"corr-def456","stream_id":"stream-ada","stellar_tx_hash":"fake-tx-xyz789"}

{"level":"error","message":"Transaction submission failed","timestamp":"2026-04-28T10:30:02.000Z","service":"streampay-frontend","environment":"production","request_id":"req-abc123","correlation_id":"corr-def456","stream_id":"stream-ada","stellar_tx_hash":"fake-tx-xyz789","error":"RPC timeout"}
```

**Benefits:**
- All logs linked by `correlation_id`
- Easy to filter by any field
- Clear timeline of events
- Structured for automated analysis

## Incident Debugging Flow

### Scenario: Settlement Failed

1. **User reports**: "My settlement failed"

2. **Get stream ID**: User provides `stream-ada123`

3. **Search logs**:
   ```bash
   stream_id:"stream-ada123" level:error
   ```

4. **Find correlation_id**: From error log, get `corr-def456`

5. **Trace full flow**:
   ```bash
   correlation_id:"corr-def456" | sort @timestamp asc
   ```

6. **Identify failure point**:
   - Was the stream found?
   - Was the state valid?
   - Did transaction submit?
   - Did it fail on chain?
   - Were there retries?

7. **Check retry count**:
   ```bash
   correlation_id:"corr-def456" retry_count:*
   ```

8. **Check Stellar transaction**:
   ```bash
   stellar_tx_hash:"fake-tx-xyz789"
   ```

## Common Search Patterns

### Find all errors for a stream
```bash
stream_id:"stream-abc123" level:error
```

### Find all retries
```bash
retry_count:*
```

### Find slow requests (>1s)
```bash
duration_ms:>1000
```

### Find failed transactions
```bash
level:error stellar_tx_hash:*
```

### Find webhook failures
```bash
webhook_id:* level:error
```

### Find queue processing issues
```bash
queue_name:"settlement-queue" level:error
```

## Security Notes

### Header Spoofing Prevention

External clients cannot override internal correlation IDs:
- Untrusted requests get fresh correlation IDs
- Only trusted internal services (localhost, authenticated) can set correlation headers
- `traceparent` from external clients is ignored

### Internal Headers Stripped

The following headers are never exposed in responses:
- `x-internal-auth`
- `x-service-token`
- `x-correlation-id-internal`

Only safe tracing headers are exposed:
- `x-request-id`
- `x-correlation-id`
- `traceparent` (when present)

### PII Handling

- No automatic PII logging
- PII must be explicitly added by developers if needed
- Review logs before adding sensitive fields
- Consider redaction for email addresses, phone numbers, etc.

## PII Policy

**Never log:**
- Wallet seed phrases
- Private keys
- Auth tokens
- Full credit card numbers
- SSN or government IDs
- Passwords (even hashed)

**Safe to log:**
- User IDs (internal identifiers)
- Stream IDs
- Transaction hashes
- Error codes
- Status values
- Non-sensitive metadata

**Use caution with:**
- Email addresses (consider redaction)
- Phone numbers (consider redaction)
- Names (consider if truly necessary)
- IP addresses (consider privacy implications)

## Integration with Backend Services

When backend services are added, they should:

1. **Accept correlation headers** from the frontend:
   - `x-request-id`
   - `x-correlation-id`
   - `traceparent` (optional)

2. **Propagate correlation context** through:
   - Queue jobs (add to job metadata)
   - Worker processing (restore from job metadata)
   - Chain submissions (include in logs)
   - Webhook emissions (include in internal processing)

3. **Return correlation headers** in responses:
   - `x-request-id`
   - `x-correlation-id`

4. **Strip internal headers** at public boundaries:
   - Outbound webhooks to external services
   - Public API responses

## Testing Correlation Propagation

Run the test suite to verify correlation propagation:

```bash
npm test
```

Tests cover:
- Correlation ID generation
- Header extraction
- AsyncLocalStorage propagation
- Security (header spoofing prevention)
- Public boundary protection
- Structured logging format

## Troubleshooting

### Logs missing correlation_id

**Cause**: Request not wrapped in correlation middleware

**Solution**: Ensure all API routes use `withCorrelationMiddleware`

### correlation_id changes mid-request

**Cause**: New context created instead of propagating existing

**Solution**: Use `withCorrelationContext` to propagate, don't create new context

### Headers not in response

**Cause**: Response headers not set by middleware

**Solution**: Ensure middleware wraps the entire handler

### External client setting correlation_id

**Cause**: Security check bypassed

**Solution**: Verify `isTrustedInternalRequest` is called before trusting headers

## Future Enhancements

When backend services are added, consider:

1. **OpenTelemetry integration**: Replace custom correlation with OpenTelemetry
2. **Jaeger/Zipkin**: Add distributed tracing visualization
3. **Log aggregation**: Centralize logs in ELK, Datadog, or CloudWatch
4. **Alerting**: Set up alerts on error rates by correlation_id
5. **Metrics**: Track settlement success/failure rates by stream_id

## Support

For issues with correlation propagation or logging:
1. Check this guide first
2. Review test cases in `app/lib/logger.test.ts` and `app/lib/correlation-middleware.test.ts`
3. Check implementation in `app/lib/logger.ts` and `app/lib/correlation-middleware.ts`
4. Review API route examples in `app/api/streams/`
