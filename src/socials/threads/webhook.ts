import { NextRequest } from "next/server";

import { verifyWebhook } from "@/src/socials/meta-webhook";

/**
 * Sets up GET (verification) and POST (events) handlers for the Threads webhook.
 * @param options - secret and callback(field, value) returning boolean
 * @returns Object with GET and POST handlers
 */
export const setupThreadsWebhook = (options: {
  secret: string;
  // eslint-disable-next-line -- flexible
    callback: (type: string, value: any) => Promise<boolean>;
}) => {
  return {
    GET: verifyWebhook(options.secret),
    POST: async (req: NextRequest) => {
      const payload = (await req.json()) as {
        values: { field: string; value: never }[];
      };
      let allGood = true;
      for (const { value, field } of payload.values) {
        allGood = allGood && (await options.callback(field, value));
      }
      if (!allGood) return new Response("BAD", { status: 500 });
      return new Response("OK");
    },
  };
};
