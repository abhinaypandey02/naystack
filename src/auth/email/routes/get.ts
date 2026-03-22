import type { NextRequest } from "next/server";

import { SetupEmailAuthOptions } from "@/src/auth/email/types";
import { EnvVariable, getEnv } from "@/src/env";

import { REFRESH_COOKIE_NAME, REFRESH_HEADER_NAME } from "../../constants";
import {
  generateAccessToken,
  getTokenizedResponse,
  getUserIdFromRefreshToken,
} from "../token";

/**
 * Returns the GET route handler for token refresh (exchange refresh cookie for new tokens).
 * @param options - SetupEmailAuthOptions
 * @returns Async route handler
 */
export const getGetRoute =
  (options: SetupEmailAuthOptions) => async (req: NextRequest) => {
    const refresh =
      req.cookies.get(REFRESH_COOKIE_NAME)?.value ||
      req.headers.get(REFRESH_HEADER_NAME) ||
      undefined;

    const userID = getUserIdFromRefreshToken(refresh);

    if (userID) {
      if (options.onRefresh) {
        const body = await req.json().catch(() => null);
        await options.onRefresh?.(userID, body);
      }
      return getTokenizedResponse(
        generateAccessToken(userID, getEnv(EnvVariable.SIGNING_KEY)),
        undefined,
        !!options.allowedOrigins?.length,
      );
    }

    return getTokenizedResponse(undefined, undefined, !!options.allowedOrigins?.length);
  };
