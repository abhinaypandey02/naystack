import { NextResponse } from "next/server";

import { ErrorHandler } from "../types";

export function handleError(
  status: number,
  message: string,
  onError?: ErrorHandler,
) {
  const res = onError?.({ status, message });
  if (res) return res;
  return new NextResponse(message, { status });
}
