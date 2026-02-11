import { NextRequest } from "next/server";

import { verifyWebhook } from "@/src/socials/meta-webhook";

/**
 * Sets up GET (verification) and POST (events) handlers for the Instagram webhook.
 * @param options - secret and callback(type, value, id)
 * @returns Object with GET and POST handlers
 */
export const setupInstagramWebhook = (options: {
  secret: string;
  // eslint-disable-next-line -- flexible
  callback: (type: string, value: any, id: string) => Promise<void>;
}) => {
  return {
    GET: verifyWebhook(options.secret),
    POST: async (req: NextRequest) => {
      const payload = (await req.json()) as {
        // eslint-disable-next-line -- flexible
        entry: { id: string; time: string; [key: string]: any }[];
      };
      for (const entry of payload.entry) {
        for (const type of Object.keys(entry)) {
          if (!(entry[type] instanceof Array)) continue;
          for (const change of entry[type]) {
            await options.callback(type, change, entry.id);
          }
        }
      }
      return new Response("OK");
    },
  };
};
