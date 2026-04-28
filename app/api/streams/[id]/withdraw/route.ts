import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";

function createErrorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message, request_id: "mock-request-id" } }, { status });
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const stream = db.streams.get(id);
  if (!stream) {
    return createErrorResponse("STREAM_NOT_FOUND", `Stream '${id}' not found`, 404);
  }
  if (stream.status !== "ended") {
    return createErrorResponse("INVALID_STREAM_STATE", "Only ended streams can be withdrawn from", 409);
  }
  stream.status = "withdrawn";
  stream.nextAction = undefined;
  stream.updatedAt = new Date().toISOString();
  db.streams.set(id, stream);
  return NextResponse.json({ data: stream });
}
