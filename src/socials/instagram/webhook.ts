import { NextRequest } from "next/server";

import { verifyWebhook } from "@/src/socials/meta/webhook";

/**
 * Sets up GET (verification) and POST (event handling) route handlers for the Instagram webhook.
 *
 * - **GET**: Responds to Meta's webhook verification challenge (checks `hub.verify_token` against `secret`).
 * - **POST**: Parses incoming webhook events and calls your `callback` for each event in the payload.
 *
 * @param options - Configuration object.
 * @param options.secret - The verify token you configured in the Meta Developer Portal.
 * @param options.callback - Called for each webhook event: `(type, value, id) => Promise<void>`.
 *   - `type` — Event type (e.g. `"messaging"`, `"changes"`).
 *   - `value` — Event payload.
 *   - `id` — The entry id (page or account id) from the webhook payload.
 * @returns Object with `GET` and `POST` — export as your route's handlers.
 *
 * @example
 * ```ts
 * // app/api/webhooks/instagram/route.ts
 * import { setupInstagramWebhook } from "naystack/socials";
 *
 * export const { GET, POST } = setupInstagramWebhook({
 *   secret: process.env.WEBHOOK_SECRET!,
 *   callback: async (type, value, id) => {
 *     if (type === "messaging") {
 *       console.log("New message from page", id, value);
 *     }
 *   },
 * });
 * ```
 *
 * @category Socials
 */
export const setupInstagramWebhook = (options: {
  secret: string;

  callback: (type: string, value: any, id: string) => Promise<void>;
}) => {
  return {
    GET: verifyWebhook(options.secret),
    POST: async (req: NextRequest) => {
      const payload = (await req.json()) as {
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
