import { NextRequest, NextResponse } from "next/server";

export function getCorsHeaders(
  origin: string | null,
  allowedOrigins: string[],
) {
  if (!origin || !allowedOrigins.includes(origin)) return null;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

export function withCors<
  T extends (req: NextRequest) => Promise<NextResponse | Response | undefined>,
>(handler: T, allowedOrigins?: string[]): T {
  if (!allowedOrigins?.length) return handler;
  return ((req: NextRequest) => {
    return handler(req).then((response) => {
      if (!response) return response;
      const corsHeaders = getCorsHeaders(
        req.headers.get("origin"),
        allowedOrigins,
      );
      if (corsHeaders) {
        Object.entries(corsHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      }
      return response;
    });
  }) as T;
}
