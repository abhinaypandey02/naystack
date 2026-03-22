import { NextRequest, NextResponse } from "next/server";

import { REFRESH_COOKIE_NAME, REFRESH_HEADER_NAME } from "@/src/auth/constants";

/**
 * Returns CORS headers for the given origin if it is in the allowed list.
 *
 * @param origin - The `Origin` header value from the request.
 * @param allowedOrigins - List of permitted origins.
 * @returns CORS headers object, or `null` if the origin is not allowed.
 *
 * @category Utils
 */
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

/**
 * Wraps a Next.js route handler to add CORS headers for the specified allowed origins.
 * Same-origin requests are passed through unchanged. Cross-origin requests from
 * unlisted origins are rejected with HTTP 403.
 *
 * @param handler - The route handler to wrap.
 * @param allowedOrigins - List of permitted origins. If empty or undefined, the handler is returned as-is (no CORS).
 * @returns The wrapped handler with CORS support.
 *
 * @category Utils
 */
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
    // Same-origin POSTs include Origin header — skip CORS logic for those
    const isSameOrigin = origin === req.nextUrl.origin;
    const corsHeaders = isSameOrigin
      ? null
      : getCorsHeaders(origin, allowedOrigins);
    // If cross-origin request has an origin but it's not allowed, reject before executing handler
    if (origin && !isSameOrigin && !corsHeaders) {
      return new NextResponse(null, { status: 403 });
    }
    const response = await handler(req);
    if (!response || !corsHeaders) return response;
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    // Cross-origin requests need SameSite=None so browsers accept and send the refresh cookie
    if (response instanceof NextResponse) {
      const refreshCookie = response.cookies.get(REFRESH_COOKIE_NAME);
      if (refreshCookie) {
        response.cookies.set(refreshCookie.name, refreshCookie.value, {
          ...refreshCookie,
          sameSite: "none",
          secure: true,
        });
      }
    }
    return response;
  }) as T;
}
