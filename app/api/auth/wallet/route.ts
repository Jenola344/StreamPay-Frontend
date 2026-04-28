import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "streampay-dev-secret-do-not-use-in-prod";

function createErrorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message, request_id: "mock-request-id" } }, { status });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { publicKey, signature, message } = body;

    if (!publicKey || !signature || !message) {
      return createErrorResponse("VALIDATION_ERROR", "Missing required fields: publicKey, signature, message", 422);
    }

    if (message !== "Sign this message to authenticate with StreamPay. Nonce: abc123") {
      return createErrorResponse("INVALID_SIGNATURE", "Signature verification failed", 401);
    }

    const token = jwt.sign({ sub: publicKey, iss: "streampay" }, JWT_SECRET, { expiresIn: "15m" });

    return NextResponse.json({ accessToken: token, expiresIn: 900 });
  } catch {
    return createErrorResponse("INVALID_REQUEST", "Request body must be valid JSON", 400);
  }
}
