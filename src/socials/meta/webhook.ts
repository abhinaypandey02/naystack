import { NextRequest, NextResponse } from "next/server";

/**
 * Returns a GET handler that verifies a Meta (Instagram/Threads) webhook subscription.
 * Responds with `hub.challenge` when `hub.verify_token` matches the provided secret.
 *
 * Used internally by `setupInstagramWebhook` and `setupThreadsWebhook`.
 *
 * @param secret - Expected `hub.verify_token` value (configured in the Meta Developer Portal).
 * @returns GET route handler that responds to Meta's verification request.
 *
 * @category Socials
 */
export const verifyWebhook = (secret: string) => (req: NextRequest) => {
  const params = req.nextUrl.searchParams;
  if (params.get("hub.verify_token") === secret) {
    return new NextResponse(params.get("hub.challenge"));
  }
};
