import type { NextRequest } from "next/server";

import { InitRoutesOptions } from "@/src/auth/email/types";

import {
  generateAccessToken,
  getTokenizedResponse,
  getUserIdFromRefreshToken,
} from "../token";

export const getGetRoute =
  (options: InitRoutesOptions) => async (req: NextRequest) => {
    const refresh = req.cookies.get("refresh")?.value;

    const userID = getUserIdFromRefreshToken(options.keys.refresh, refresh);

    if (userID) {
      if (options.onRefresh) {
        await options.onRefresh?.(userID, req);
      }
      return getTokenizedResponse(
        generateAccessToken(userID, options.keys.signing),
      );
    }

    return getTokenizedResponse();
  };
