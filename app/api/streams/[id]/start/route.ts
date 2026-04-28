import { NextResponse, NextRequest } from "next/server";
import { db } from "@/app/lib/db";
import { withCorrelationMiddleware, withStreamContext } from "@/app/lib/correlation-middleware";
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
    
    logger.info('Stream start request', { stream_id: id });
    
    const stream = db.streams.get(id);
    if (!stream) {
      logger.warn('Stream not found for start', { stream_id: id });
      return createErrorResponse("STREAM_NOT_FOUND", `Stream '${id}' not found`, 404);
    }
    if (stream.status !== "draft") {
      logger.warn('Invalid stream state for start', { stream_id: id, status: stream.status });
      return createErrorResponse("INVALID_STREAM_STATE", "Only draft streams can be started", 409);
    }
    
    stream.status = "active";
    stream.nextAction = "pause";
    stream.updatedAt = new Date().toISOString();
    db.streams.set(id, stream);
    
    withStreamContext(id);
    logger.info('Stream started successfully', { stream_id: id });
    
    return NextResponse.json({ data: stream });
  });
}
