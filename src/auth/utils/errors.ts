import { NextResponse } from "next/server";

import { ErrorHandler } from "../types";

/**
 * Creates a NextResponse for an error, or delegates to a custom `onError` handler if provided.
 * Used internally by auth routes for consistent error handling.
 *
 * @param status - HTTP status code.
 * @param message - Error message body.
 * @param onError - Optional custom handler; if it returns a Response, that is used instead of the default.
 * @returns NextResponse with the given status and message, or the custom handler's response.
 * @category Auth
 */
export function handleError(
  status: number,
  message: string,
  onError?: ErrorHandler,
) {
  const res = onError?.({ status, message });
  if (res) return res;
  return new NextResponse(message, { status });
}
