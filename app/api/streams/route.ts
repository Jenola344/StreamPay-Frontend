import { NextResponse, NextRequest } from "next/server";
import { db } from "@/app/lib/db";
import { encodeCursor, decodeCursor } from "@/app/lib/db";
import { withCorrelationMiddleware, withStreamContext } from "@/app/lib/correlation-middleware";
import { logger, getCorrelationContext } from "@/app/lib/logger";

function createErrorResponse(code: string, message: string, status: number) {
  const context = getCorrelationContext();
  return NextResponse.json({ error: { code, message, request_id: context?.request_id } }, { status });
}

export async function GET(request: Request) {
  return withCorrelationMiddleware(request as NextRequest, async () => {
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);

    logger.info('Listing streams', { status, limit });

    let streams = Array.from(db.streams.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    if (status) {
      streams = streams.filter((s) => s.status === status);
    }

    if (cursor) {
      const cursorId = decodeCursor(cursor);
      const cursorIndex = streams.findIndex((s) => s.id === cursorId);
      if (cursorIndex >= 0) {
        streams = streams.slice(cursorIndex + 1);
      }
    }

    const paginatedStreams = streams.slice(0, limit);
    const hasNext = streams.length > limit;
    const nextCursor = hasNext && paginatedStreams.length > 0 ? encodeCursor(paginatedStreams[paginatedStreams.length - 1].id) : null;

    logger.info('Streams listed successfully', { count: paginatedStreams.length, total: db.streams.size });

    return NextResponse.json({
      data: paginatedStreams,
      meta: { hasNext, nextCursor, total: db.streams.size },
      links: { self: `/api/v1/streams?limit=${limit}` },
    });
  });
}

export async function POST(request: Request) {
  return withCorrelationMiddleware(request as NextRequest, async () => {
    const idempotencyKey = request.headers.get("Idempotency-Key");
    
    logger.info('Stream creation request', { idempotency_key: idempotencyKey });
    
    if (idempotencyKey && db.idempotency.has(idempotencyKey)) {
      logger.info('Idempotent request detected', { idempotency_key: idempotencyKey });
      return NextResponse.json(db.idempotency.get(idempotencyKey), { status: 201 });
    }

    try {
      const body = await request.json();
      const { recipient, rate, schedule } = body;

      if (!recipient || !rate || !schedule) {
        logger.warn('Stream creation validation failed', { fields: { recipient: !!recipient, rate: !!rate, schedule: !!schedule } });
        return createErrorResponse("VALIDATION_ERROR", "Missing required fields: recipient, rate, schedule", 422);
      }

      const id = `stream-${crypto.randomUUID().slice(0, 8)}`;
      const now = new Date().toISOString();
      const newStream = { id, recipient, rate, schedule, status: "draft" as const, nextAction: "start" as const, createdAt: now, updatedAt: now };

      db.streams.set(id, newStream);

      if (idempotencyKey) {
        db.idempotency.set(idempotencyKey, newStream);
      }

      // Add stream context to correlation
      withStreamContext(id);
      
      logger.info('Stream created successfully', { stream_id: id, recipient });

      return NextResponse.json({ data: newStream, links: { self: `/api/v1/streams/${id}` } }, { status: 201 });
    } catch (error) {
      logger.error('Stream creation failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      return createErrorResponse("INVALID_REQUEST", "Request body must be valid JSON", 400);
    }
  });
}
