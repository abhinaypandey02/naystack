import { NextRequest, NextResponse } from "next/server";

import { getUserIdFromAccessToken } from "@/src/auth/email/token";
import { InitInstagramAuthOptions } from "@/src/auth/instagram/index";
import { getLongLivedToken } from "@/src/auth/instagram/utils";
import { EnvVariable, getEnv } from "@/src/env";
import { getInstagramUser } from "@/src/socials";

/**
 * Returns the GET route handler for Instagram OAuth callback.
 * @param options - InitInstagramAuthOptions (onUser, redirect URLs)
 * @returns Async route handler for the OAuth callback
 */
export const getInstagramRoute = ({
  successRedirectURL,
  errorRedirectURL,
  onUser,
}: InitInstagramAuthOptions) => {
  const handleError = (message: string) =>
    NextResponse.redirect(`${errorRedirectURL}?error=${message}`);
  return async (req: NextRequest) => {
    const accessCode = req.nextUrl.searchParams.get("code");
    const error = req.nextUrl.searchParams.get("error");
    const stateToken = req.nextUrl.searchParams.get("state");
    if (error) return handleError(error);
    if (!stateToken || !accessCode) return handleError("Invalid request");
    const instagramData = await getLongLivedToken(
      accessCode,
      getEnv(EnvVariable.NEXT_PUBLIC_INSTAGRAM_AUTH_ENDPOINT),
      getEnv(EnvVariable.INSTAGRAM_CLIENT_ID),
      getEnv(EnvVariable.INSTAGRAM_CLIENT_SECRET),
    );
    if (!instagramData?.accessToken)
      return handleError("Unable to reach Instagram");

    const personalInfo = await getInstagramUser(instagramData.accessToken);
    if (!personalInfo?.username) return handleError("You are not logged in");
    const loggedInUserID = getUserIdFromAccessToken(stateToken);

    const errorMessage = await onUser(
      personalInfo,
      loggedInUserID,
      instagramData.accessToken,
    );
    if (errorMessage) return handleError(errorMessage);
    return NextResponse.redirect(successRedirectURL);
  };
};
