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
  if (stream.status !== "active" && stream.status !== "paused") {
    return createErrorResponse("INVALID_STREAM_STATE", "Only active or paused streams can be settled", 409);
  }

  const before = structuredClone(stream);
  const txHash = `fake-tx-${crypto.randomUUID().slice(0, 8)}`;
  const settledAt = new Date().toISOString();
  const updatedStream = {
    ...stream,
    status: "ended" as const,
    nextAction: "withdraw" as const,
    updatedAt: settledAt,
  };

  db.streams.set(id, updatedStream);
  recordPrivilegedStreamAuditEvent({
    action: "stream.settle",
    after: updatedStream,
    before,
    metadata: {
      resultingStatus: updatedStream.status,
      settlementTxHash: txHash,
    },
    request,
    streamId: id,
    targetAccount: updatedStream.recipient,
  });

  return NextResponse.json({
    data: {
      ...updatedStream,
      settlement: {
        txHash,
        settledAt,
      },
    },
  });
}
