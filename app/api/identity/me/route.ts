import { NextResponse, NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { withCorrelationMiddleware } from "@/app/lib/correlation-middleware";
import { logger, getCorrelationContext } from "@/app/lib/logger";

const JWT_SECRET = process.env.JWT_SECRET || "streampay-dev-secret-do-not-use-in-prod";

function createErrorResponse(code: string, message: string, status: number) {
  const context = getCorrelationContext();
  return NextResponse.json({ error: { code, message, request_id: context?.request_id } }, { status });
}

export async function GET(request: Request) {
  return withCorrelationMiddleware(request as NextRequest, async () => {
    const authHeader = request.headers.get("authorization");
    
    logger.info('Identity me request');
    
    if (!authHeader?.startsWith("Bearer ")) {
      logger.warn('Missing or invalid authorization header');
      return createErrorResponse("UNAUTHORIZED", "Missing or invalid authorization header", 401);
    }
    const token = authHeader.slice(7);
    try {
      const verified = jwt.verify(token, JWT_SECRET) as { sub?: string };
      if (!verified.sub) {
        logger.warn('Invalid or expired token');
        return createErrorResponse("UNAUTHORIZED", "Invalid or expired token", 401);
      }
      
      logger.info('Identity me request successful', { wallet_address: verified.sub });
      
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
    } catch (error) {
      logger.error('Token verification failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      return createErrorResponse("UNAUTHORIZED", "Invalid or expired token", 401);
    }
  });
}
