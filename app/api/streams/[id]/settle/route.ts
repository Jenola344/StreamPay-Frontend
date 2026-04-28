import { NextResponse } from "next/server";
import { db, idempotencyToken } from "@/app/lib/db";
import { getStellarSettlementClient } from "@/app/lib/stellar";

function createErrorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message, request_id: "mock-request-id" } }, { status });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const idempotencyKey = request.headers.get("Idempotency-Key");
  const token = idempotencyKey ? idempotencyToken(`streams.settle.${id}`, idempotencyKey) : null;

  if (token && db.idempotency.has(token)) {
    return NextResponse.json(db.idempotency.get(token));
  }

  const stream = db.streams.get(id);
  if (!stream) {
    return createErrorResponse("STREAM_NOT_FOUND", `Stream '${id}' not found`, 404);
  }
  if (stream.status !== "active" && stream.status !== "paused") {
    return createErrorResponse("INVALID_STREAM_STATE", "Only active or paused streams can be settled", 409);
  }
  stream.status = "ended";
  stream.nextAction = "withdraw";
  stream.updatedAt = new Date().toISOString();
  db.streams.set(id, stream);

  try {
    const settlement = await getStellarSettlementClient().settleStream({ streamId: id });
    const payload = { data: { ...stream, settlement } };

    if (token) {
      db.idempotency.set(token, payload);
    }

    return NextResponse.json(payload);
  } catch {
    return createErrorResponse("SETTLEMENT_FAILED", "Failed to settle stream on Stellar/Soroban", 502);
  }
}
