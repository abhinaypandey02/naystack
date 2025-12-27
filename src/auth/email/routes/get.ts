import type { NextRequest } from "next/server";

import { InitRoutesOptions } from "@/src/auth/email/types";

import { REFRESH_COOKIE_NAME } from "../../constants";
import {
  generateAccessToken,
  getTokenizedResponse,
  getUserIdFromRefreshToken,
} from "../token";

export const getGetRoute =
  (options: InitRoutesOptions) => async (req: NextRequest) => {
    const refresh = req.cookies.get(REFRESH_COOKIE_NAME)?.value;

    const userID = getUserIdFromRefreshToken(options.keys.refresh, refresh);

    if (userID) {
      if (options.onRefresh) {
        const body = await req.json();
        await options.onRefresh?.(userID, body);
      }
      return getTokenizedResponse(
        generateAccessToken(userID, options.keys.signing),
      );
    }

    return getTokenizedResponse();
  };
