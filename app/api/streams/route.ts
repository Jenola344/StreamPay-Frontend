import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { encodeCursor, decodeCursor } from "@/app/lib/db";
import { v4 as uuidv4 } from "uuid";

function createErrorResponse(code: string, message: string, status: number, requestId = "mock-request-id") {
  return NextResponse.json({ error: { code, message, request_id: requestId } }, { status });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const status = searchParams.get("status");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);

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

  return NextResponse.json({
    data: paginatedStreams,
    meta: { hasNext, nextCursor, total: db.streams.size },
    links: { self: `/api/v1/streams?limit=${limit}` },
  });
}

export async function POST(request: Request) {
  const idempotencyKey = request.headers.get("Idempotency-Key");
  if (idempotencyKey && db.idempotency.has(idempotencyKey)) {
    return NextResponse.json(db.idempotency.get(idempotencyKey), { status: 201 });
  }

  try {
    const body = await request.json();
    const { recipient, rate, schedule } = body;

    if (!recipient || !rate || !schedule) {
      return createErrorResponse("VALIDATION_ERROR", "Missing required fields: recipient, rate, schedule", 422);
    }

    const id = `stream-${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();
    const newStream = { id, recipient, rate, schedule, status: "draft" as const, nextAction: "start" as const, createdAt: now, updatedAt: now };

    db.streams.set(id, newStream);

    if (idempotencyKey) {
      db.idempotency.set(idempotencyKey, newStream);
    }

    return NextResponse.json({ data: newStream, links: { self: `/api/v1/streams/${id}` } }, { status: 201 });
  } catch {
    return createErrorResponse("INVALID_REQUEST", "Request body must be valid JSON", 400);
  }
}
