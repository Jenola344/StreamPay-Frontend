import { NextResponse, NextRequest } from "next/server";
import { db } from "@/app/lib/db";
import { withCorrelationMiddleware, withStreamContext, withStellarContext } from "@/app/lib/correlation-middleware";
import { logger, getCorrelationContext } from "@/app/lib/logger";

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
    
    // Simulate chain submission
    const txHash = `fake-tx-${crypto.randomUUID().slice(0, 8)}`;
    withStellarContext(txHash);
    
    logger.info('Settlement transaction submitted', { 
      stream_id: id, 
      stellar_tx_hash: txHash,
      previous_status: stream.status 
    });
    
    stream.status = "ended";
    stream.nextAction = "withdraw";
    stream.updatedAt = new Date().toISOString();
    db.streams.set(id, stream);
    
    logger.info('Settlement completed successfully', { 
      stream_id: id, 
      stellar_tx_hash: txHash 
    });
    
    return NextResponse.json({
      data: {
        ...stream,
        settlement: {
          txHash,
          settledAt: new Date().toISOString(),
        },
      },
    });
  });
}
