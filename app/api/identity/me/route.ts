import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "streampay-dev-secret-do-not-use-in-prod";

function createErrorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message, request_id: "mock-request-id" } }, { status });
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return createErrorResponse("UNAUTHORIZED", "Missing or invalid authorization header", 401);
  }
  const token = authHeader.slice(7);
  try {
    const verified = jwt.verify(token, JWT_SECRET) as { sub?: string };
    if (!verified.sub) {
      return createErrorResponse("UNAUTHORIZED", "Invalid or expired token", 401);
    }
    return NextResponse.json({
      data: {
        wallet_address: verified.sub,
        email: null,
        display_name: verified.sub.slice(0, 16) + "...",
        avatar_url: null,
        created_at: "2026-04-01T09:00:00Z",
      },
      links: { self: "/api/v1/identity/me" },
    });
  } catch {
    return createErrorResponse("UNAUTHORIZED", "Invalid or expired token", 401);
  }
}
