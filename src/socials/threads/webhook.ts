import { NextRequest } from "next/server";

import { verifyWebhook } from "@/src/socials/meta-webhook";

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
