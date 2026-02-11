import { NextResponse } from "next/server";

import { ErrorHandler } from "../types";

/**
 * Creates a NextResponse for an error status, or delegates to a custom onError handler.
 * @param status - HTTP status code
 * @param message - Error message body
 * @param onError - Optional custom handler returning a Response
 * @returns NextResponse or custom response
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
