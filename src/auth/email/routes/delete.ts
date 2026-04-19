import { NextRequest } from "next/server";

import { SetupEmailAuthOptions } from "@/src/auth/email/types";

import { getTokenizedResponse } from "../token";
import { getContext } from "../utils";

/**
 * Returns the DELETE route handler for logout.
 * @param options - SetupEmailAuthOptions
 * @returns Async route handler
 */
export const getDeleteRoute =
  (options: SetupEmailAuthOptions) => async (req: NextRequest) => {
    if (options.onLogout) {
      try {
        const ctx = await getContext(req);
        const body = await req.json();
        await options.onLogout?.(ctx.userId, body);
      } catch (e) {
        console.error(e);
      }
    }
    return getTokenizedResponse();
  };
