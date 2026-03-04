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
        const newResponse = new NextResponse(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: new Headers(response.headers),
        });
        Object.entries(corsHeaders).forEach(([key, value]) => {
          newResponse.headers.set(key, value);
        });
        return newResponse;
      }
      return response;
    });
  }) as T;
}
