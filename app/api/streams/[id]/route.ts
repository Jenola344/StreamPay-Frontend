import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";

function createErrorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message, request_id: "mock-request-id" } }, { status });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const stream = db.streams.get(id);
  if (!stream) {
    return createErrorResponse("STREAM_NOT_FOUND", `Stream '${id}' not found`, 404);
  }
  return NextResponse.json({ data: stream, links: { self: `/api/v1/streams/${id}` } });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const stream = db.streams.get(id);
  if (!stream) {
    return createErrorResponse("STREAM_NOT_FOUND", `Stream '${id}' not found`, 404);
  }
  if (stream.status === "active" || stream.status === "paused") {
    return createErrorResponse("STREAM_INACTIVE_STATE", "Cannot delete a stream that is active or paused. Stop it first.", 409);
  }
  db.streams.delete(id);
  return new NextResponse(null, { status: 204 });
}
