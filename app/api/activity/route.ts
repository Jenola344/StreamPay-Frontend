import { NextResponse, NextRequest } from "next/server";
import { db, encodeCursor, decodeCursor } from "@/app/lib/db";
import { withCorrelationMiddleware } from "@/app/lib/correlation-middleware";
import { logger, getCorrelationContext } from "@/app/lib/logger";

function createErrorResponse(code: string, message: string, status: number) {
  const context = getCorrelationContext();
  return NextResponse.json({ error: { code, message, request_id: context?.request_id } }, { status });
}

export async function GET(request: Request) {
  return withCorrelationMiddleware(request as NextRequest, async () => {
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");
    const streamId = searchParams.get("streamId");
    const type = searchParams.get("type");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);

    logger.info('Activity list request', { stream_id: streamId, type, limit });

    let events = Array.from(db.activity.values()).sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    if (streamId) {
      events = events.filter((e) => e.streamId === streamId);
    }
    if (type) {
      events = events.filter((e) => e.type === type);
    }

    if (cursor) {
      const cursorId = decodeCursor(cursor);
      const cursorIndex = events.findIndex((e) => e.id === cursorId);
      if (cursorIndex >= 0) {
        events = events.slice(cursorIndex + 1);
      }
    }

    const paginatedEvents = events.slice(0, limit);
    const hasNext = events.length > limit;
    const nextCursor = hasNext && paginatedEvents.length > 0 ? encodeCursor(paginatedEvents[paginatedEvents.length - 1].id) : null;

    logger.info('Activity list completed', { count: paginatedEvents.length, total: db.activity.size });

    return NextResponse.json({
      data: paginatedEvents,
      meta: { hasNext, nextCursor, total: db.activity.size },
      links: { self: `/api/v1/activity?limit=${limit}` },
    });
  });
}
