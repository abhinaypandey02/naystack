import { NextRequest, NextResponse } from "next/server";

/**
 * Returns a GET handler that verifies the Meta webhook with hub.verify_token and responds with hub.challenge.
 * @param secret - Expected hub.verify_token value
 * @returns GET route handler
 */
export const verifyWebhook = (secret: string) => (req: NextRequest) => {
  const params = req.nextUrl.searchParams;
  if (params.get("hub.verify_token") === secret) {
    return new NextResponse(params.get("hub.challenge"));
  }
};
