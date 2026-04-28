import { NextResponse } from "next/server";
import { db, idempotencyToken } from "@/app/lib/db";
import { getStellarSettlementClient } from "@/app/lib/stellar";

function createErrorResponse(code: string, message: string, status: number) {
  const context = getCorrelationContext();
  return NextResponse.json({ error: { code, message, request_id: context?.request_id } }, { status });
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

  // Org Policy Check
  const actorAddress = _request.headers.get("Actor-Wallet-Address");
  const policyResult = checkStreamOrgPolicy(id, actorAddress ?? "", "settle");

  if (policyResult) {
    if (!policyResult.allowed) {
      return createErrorResponse(policyResult.code, policyResult.message, policyResult.httpStatus);
    }
    if (policyResult.requiresApproval) {
      return createErrorResponse("APPROVAL_REQUIRED", "This action requires multi-sig approval. Please initiate an approval request.", 409);
    }
  }

  if (stream.status !== "active" && stream.status !== "paused") {
    return createErrorResponse("INVALID_STREAM_STATE", "Only active or paused streams can be settled", 409);
  }
  const txHash = `fake-tx-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  stream.status = "ended";
  stream.nextAction = "withdraw";
  stream.settlementTxHash = txHash;
  stream.withdrawal = {
    state: "pending",
    requestedAt: now,
    lastCheckedAt: now,
    attempts: 0,
    settlementTxHash: txHash,
  };
  stream.updatedAt = now;
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
