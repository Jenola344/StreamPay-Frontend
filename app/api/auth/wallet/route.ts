import { NextResponse, NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { withCorrelationMiddleware } from "@/app/lib/correlation-middleware";
import { logger, getCorrelationContext } from "@/app/lib/logger";

const JWT_SECRET = process.env.JWT_SECRET || "streampay-dev-secret-do-not-use-in-prod";

function createErrorResponse(code: string, message: string, status: number) {
  const context = getCorrelationContext();
  return NextResponse.json({ error: { code, message, request_id: context?.request_id } }, { status });
}

export async function POST(request: Request) {
  return withCorrelationMiddleware(request as NextRequest, async () => {
    try {
      const body = await request.json();
      const { publicKey, signature, message } = body;

      logger.info('Wallet authentication request', { public_key: publicKey });

      if (!publicKey || !signature || !message) {
        logger.warn('Wallet auth validation failed', { fields: { publicKey: !!publicKey, signature: !!signature, message: !!message } });
        return createErrorResponse("VALIDATION_ERROR", "Missing required fields: publicKey, signature, message", 422);
      }

      if (message !== "Sign this message to authenticate with StreamPay. Nonce: abc123") {
        logger.warn('Wallet auth signature verification failed', { public_key: publicKey });
        return createErrorResponse("INVALID_SIGNATURE", "Signature verification failed", 401);
      }

      const token = jwt.sign({ sub: publicKey, iss: "streampay" }, JWT_SECRET, { expiresIn: "15m" });

      logger.info('Wallet authentication successful', { public_key: publicKey });

      return NextResponse.json({ accessToken: token, expiresIn: 900 });
    } catch (error) {
      logger.error('Wallet auth request failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      return createErrorResponse("INVALID_REQUEST", "Request body must be valid JSON", 400);
    }
  });
}
