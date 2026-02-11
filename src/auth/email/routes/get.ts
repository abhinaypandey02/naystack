import type { NextRequest } from "next/server";

import { InitRoutesOptions } from "@/src/auth/email/types";
import { EnvVariable, getEnv } from "@/src/env";

import { REFRESH_COOKIE_NAME } from "../../constants";
import {
  generateAccessToken,
  getTokenizedResponse,
  getUserIdFromRefreshToken,
} from "../token";

/**
 * Returns the GET route handler for token refresh (exchange refresh cookie for new tokens).
 * @param options - InitRoutesOptions
 * @returns Async route handler
 */
export const getGetRoute =
  (options: InitRoutesOptions) => async (req: NextRequest) => {
    const refresh = req.cookies.get(REFRESH_COOKIE_NAME)?.value;

    const userID = getUserIdFromRefreshToken(refresh);

    if (userID) {
      if (options.onRefresh) {
        const body = await req.json();
        await options.onRefresh?.(userID, body);
      }
      return getTokenizedResponse(
        generateAccessToken(userID, getEnv(EnvVariable.SIGNING_KEY)),
      );
    }

    return getTokenizedResponse();
  };
