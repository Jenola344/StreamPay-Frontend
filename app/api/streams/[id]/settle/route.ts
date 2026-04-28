import { NextResponse, NextRequest } from "next/server";
import { db } from "@/app/lib/db";
import { withCorrelationMiddleware, withStreamContext, withStellarContext } from "@/app/lib/correlation-middleware";
import { logger, getCorrelationContext } from "@/app/lib/logger";
import { settlementQueue } from "@/app/lib/queue";
import { stellarService } from "@/app/lib/stellar";
import { webhookService } from "@/app/lib/webhook";

function createErrorResponse(code: string, message: string, status: number) {
  const context = getCorrelationContext();
  return NextResponse.json({ error: { code, message, request_id: context?.request_id } }, { status });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withCorrelationMiddleware(request as NextRequest, async () => {
    const { id } = await params;
    
    // Add stream context to correlation
    withStreamContext(id);
    
    logger.info('Settlement request received', { stream_id: id });
    
    const stream = db.streams.get(id);
    if (!stream) {
      logger.warn('Stream not found for settlement', { stream_id: id });
      return createErrorResponse("STREAM_NOT_FOUND", `Stream '${id}' not found`, 404);
    }
    if (stream.status !== "active" && stream.status !== "paused") {
      logger.warn('Invalid stream state for settlement', { stream_id: id, status: stream.status });
      return createErrorResponse("INVALID_STREAM_STATE", "Only active or paused streams can be settled", 409);
    }
    
    // Enqueue settlement job with correlation context
    const job = await settlementQueue.add('settlement', {
      streamId: id,
      recipient: stream.recipient,
      rate: stream.rate,
    });

    logger.info('Settlement job enqueued', {
      stream_id: id,
      job_id: job.id,
      queue_name: job.queueName,
      correlation_id: job.correlationContext.correlation_id,
    });

    // Process the job immediately (in a real system, this would be async)
    // This demonstrates the full propagation flow
    try {
      // Submit to Stellar chain
      const tx = await stellarService.submitTransaction({
        streamId: id,
        amount: stream.rate,
        recipient: stream.recipient,
      });

      // Emit webhook
      await webhookService.emitWebhook({
        url: 'https://example.com/webhook',
        payload: {
          eventType: 'stream.settled',
          streamId: id,
          data: {
            txHash: tx.txHash,
            amount: tx.amount,
            recipient: tx.recipient,
          },
          timestamp: new Date().toISOString(),
        },
      });

      // Update stream status
      stream.status = "ended";
      stream.nextAction = "withdraw";
      stream.updatedAt = new Date().toISOString();
      db.streams.set(id, stream);

      logger.info('Settlement completed successfully', { 
        stream_id: id, 
        stellar_tx_hash: tx.txHash,
        job_id: job.id,
      });

      return NextResponse.json({
        data: {
          ...stream,
          settlement: {
            txHash: tx.txHash,
            settledAt: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      logger.error('Settlement processing failed', {
        stream_id: id,
        job_id: job.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return createErrorResponse("SETTLEMENT_FAILED", "Settlement processing failed", 500);
    }
  });
}
