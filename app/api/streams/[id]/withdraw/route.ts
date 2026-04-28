import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { recordPrivilegedStreamAuditEvent } from "@/app/lib/audit-log";

function createErrorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message, request_id: "mock-request-id" } }, { status });
}

export async function POST(
  request: Request,
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

  const before = structuredClone(stream);
  const updatedStream = {
    ...stream,
    status: "withdrawn" as const,
    nextAction: undefined,
    updatedAt: new Date().toISOString(),
  };

  db.streams.set(id, updatedStream);
  recordPrivilegedStreamAuditEvent({
    action: "stream.withdraw",
    after: updatedStream,
    before,
    metadata: {
      resultingStatus: updatedStream.status,
    },
    request,
    streamId: id,
    targetAccount: updatedStream.recipient,
  });

  return NextResponse.json({ data: updatedStream });
}
