import { NextRequest } from "next/server";

import { verifyWebhook } from "@/src/socials/meta/webhook";

/**
 * Sets up GET (verification) and POST (event handling) route handlers for the Threads webhook.
 *
 * - **GET**: Responds to Meta's webhook verification challenge (checks `hub.verify_token` against `secret`).
 * - **POST**: Parses incoming webhook events and calls your `callback` for each event.
 *
 * @param options - Configuration object.
 * @param options.secret - The verify token you configured in the Meta Developer Portal.
 * @param options.callback - Called for each webhook event: `(field, value) => Promise<boolean>`.
 *   - `field` — Event field name.
 *   - `value` — Event payload.
 *   Return `true` to acknowledge; return `false` to respond with HTTP 500.
 * @returns Object with `GET` and `POST` — export as your route's handlers.
 *
 * @example
 * ```ts
 * // app/api/webhooks/threads/route.ts
 * import { setupThreadsWebhook } from "naystack/socials";
 *
 * export const { GET, POST } = setupThreadsWebhook({
 *   secret: process.env.WEBHOOK_SECRET!,
 *   callback: async (field, value) => {
 *     console.log("Threads event:", field, value);
 *     return true; // Return false to respond with 500
 *   },
 * });
 * ```
 *
 * @category Socials
 */
export const setupThreadsWebhook = (options: {
  secret: string;

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
