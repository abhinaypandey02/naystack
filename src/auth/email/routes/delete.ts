import { NextRequest } from "next/server";

import { InitRoutesOptions } from "@/src/auth/email/types";

import { getTokenizedResponse } from "../token";

export const getDeleteRoute =
  (options: InitRoutesOptions) => async (req: NextRequest) => {
    if (options.onLogout) await options.onLogout?.(await req.json());
    return getTokenizedResponse(undefined, "");
  };
