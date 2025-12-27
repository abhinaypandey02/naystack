import { NextRequest } from "next/server";

import { InitRoutesOptions } from "@/src/auth/email/types";

import { getTokenizedResponse } from "../token";
import { getContext } from "../utils";

export const getDeleteRoute =
  (options: InitRoutesOptions) => async (req: NextRequest) => {
    if (options.onLogout) {
      const ctx = await getContext(options.keys, req);
      const body = await req.json();
      await options.onLogout?.(ctx.userId, body);
    }
    return getTokenizedResponse(undefined, "");
  };
