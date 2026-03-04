import { NextRequest, NextResponse } from "next/server";

import { REFRESH_HEADER_NAME } from "@/src/auth/constants";

export function getCorsHeaders(
  origin: string | null,
  allowedOrigins: string[],
) {
  if (!origin || !allowedOrigins.includes(origin)) return null;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": `Content-Type, Authorization, ${REFRESH_HEADER_NAME}`,
    "Access-Control-Allow-Credentials": "true",
  };
}

export function withCors<
  T extends (
    req: NextRequest,
  ) =>
    | Promise<NextResponse | Response | undefined>
    | NextResponse
    | Response
    | undefined,
>(handler: T, allowedOrigins?: string[]): T {
  if (!allowedOrigins?.length) return handler;
  return (async (req: NextRequest) => {
    const origin = req.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin, allowedOrigins);
    // If request has an origin but it's not allowed, reject before executing handler
    if (origin && !corsHeaders) {
      return new NextResponse(null, { status: 403 });
    }
    const response = await handler(req);
    if (!response || !corsHeaders) return response;
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }) as T;
}
