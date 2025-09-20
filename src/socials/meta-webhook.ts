import { NextRequest, NextResponse } from "next/server";

export const verifyWebhook = (secret: string) => (req: NextRequest) => {
  const params = req.nextUrl.searchParams;
  if (params.get("hub.verify_token") === secret) {
    return new NextResponse(params.get("hub.challenge"));
  }
};
