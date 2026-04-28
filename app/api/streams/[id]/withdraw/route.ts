import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { evaluateWithdrawalState } from "@/app/lib/withdraw-finality";

function createErrorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message, request_id: "mock-request-id" } }, { status });
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(_request.url);
  const limitType = getLimitForRoute("POST", url.pathname);
  const identity = getClientIdentity(_request);
  const result = await checkRateLimit(identity, limitType);

  if (!result.allowed) {
    recordThrottle(url.pathname, limitType, identity.type, identity.displayValue);
    return rateLimitResponse(result.retryAfter!);
  }
  recordRequest(url.pathname);

  const stream = db.streams.get(id);
  if (!stream) {
    return createErrorResponse("STREAM_NOT_FOUND", `Stream '${id}' not found`, 404);
  }
  if (stream.status !== "ended") {
    if (stream.status === "withdrawn") {
      return NextResponse.json({ data: stream });
    }
    return createErrorResponse("INVALID_STREAM_STATE", "Only ended streams can be withdrawn from", 409);
  }
  const { stream: updated, alert } = await evaluateWithdrawalState(stream, new Date(), fetch);
  db.streams.set(id, updated);
  return NextResponse.json({
    data: updated,
    withdrawal: updated.withdrawal,
    alert,
  });
}
