import { NextResponse } from "next/server";
import { db, encodeCursor, decodeCursor } from "@/app/lib/db";

function createErrorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message, request_id: "mock-request-id" } }, { status });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const streamId = searchParams.get("streamId");
  const type = searchParams.get("type");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);

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

  return NextResponse.json({
    data: paginatedEvents,
    meta: { hasNext, nextCursor, total: db.activity.size },
    links: { self: `/api/v1/activity?limit=${limit}` },
  });
}
