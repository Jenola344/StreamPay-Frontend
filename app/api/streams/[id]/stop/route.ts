import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { checkStreamOrgPolicy } from "@/app/lib/org-policy";

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

  // Org Policy Check
  const actorAddress = _request.headers.get("Actor-Wallet-Address");
  const policyResult = checkStreamOrgPolicy(id, actorAddress ?? "", "stop");

  if (policyResult) {
    if (!policyResult.allowed) {
      return createErrorResponse(policyResult.code, policyResult.message, policyResult.httpStatus);
    }
    if (policyResult.requiresApproval) {
      return createErrorResponse("APPROVAL_REQUIRED", "This action requires multi-sig approval. Please initiate an approval request.", 409);
    }
  }

  if (stream.status !== "active" && stream.status !== "draft") {
    return createErrorResponse("INVALID_STREAM_STATE", "Only active or draft streams can be stopped", 409);
  }
  stream.status = "ended";
  stream.nextAction = "withdraw";
  stream.updatedAt = new Date().toISOString();
  db.streams.set(id, stream);
  return NextResponse.json({ data: stream });
}
