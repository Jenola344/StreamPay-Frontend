import { NextResponse, NextRequest } from "next/server";
import { db } from "@/app/lib/db";
import { withCorrelationMiddleware, withStreamContext } from "@/app/lib/correlation-middleware";
import { logger, getCorrelationContext } from "@/app/lib/logger";

function createErrorResponse(code: string, message: string, status: number) {
  const context = getCorrelationContext();
  return NextResponse.json({ error: { code, message, request_id: context?.request_id } }, { status });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withCorrelationMiddleware(request as NextRequest, async () => {
    const { id } = await params;
    
    logger.info('Stream fetch request', { stream_id: id });
    
    const stream = db.streams.get(id);
    if (!stream) {
      logger.warn('Stream not found', { stream_id: id });
      return createErrorResponse("STREAM_NOT_FOUND", `Stream '${id}' not found`, 404);
    }
    
    withStreamContext(id);
    logger.info('Stream fetched successfully', { stream_id: id });
    
    return NextResponse.json({ data: stream, links: { self: `/api/v1/streams/${id}` } });
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withCorrelationMiddleware(request as NextRequest, async () => {
    const { id } = await params;
    
    logger.info('Stream deletion request', { stream_id: id });
    
    const stream = db.streams.get(id);
    if (!stream) {
      logger.warn('Stream not found for deletion', { stream_id: id });
      return createErrorResponse("STREAM_NOT_FOUND", `Stream '${id}' not found`, 404);
    }
    if (stream.status === "active" || stream.status === "paused") {
      logger.warn('Invalid stream state for deletion', { stream_id: id, status: stream.status });
      return createErrorResponse("STREAM_INACTIVE_STATE", "Cannot delete a stream that is active or paused. Stop it first.", 409);
    }
    
    db.streams.delete(id);
    logger.info('Stream deleted successfully', { stream_id: id });
    
    return new NextResponse(null, { status: 204 });
  });
}
