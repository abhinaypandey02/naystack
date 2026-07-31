import { NextRequest, NextResponse } from "next/server";

import { getUserIdFromAccessToken } from "@/src/auth/email/token";
import { SetupInstagramAuthOptions } from "@/src/auth/instagram/index";
import {
  getAuthorizationHandoff,
  getInstagramAuthorizationURL,
  getLongLivedToken,
} from "@/src/auth/instagram/utils";
import { EnvVariable, getEnv } from "@/src/env";
import { getInstagramUser } from "@/src/socials";

/**
 * Returns the GET route handler for Instagram OAuth callback.
 * @param options - SetupInstagramAuthOptions (onUser, redirect URLs)
 * @returns Async route handler for the OAuth callback
 */
export const getInstagramRoute = ({
  redirectURL,
  errorRedirectURL,
  onUser,
}: SetupInstagramAuthOptions) => {
  /** Redirects to error URL with message query param. */
  const handleError = (message: string) =>
    NextResponse.redirect(`${errorRedirectURL}?error=${message}`);
  return async (req: NextRequest) => {
    const accessCode = req.nextUrl.searchParams.get("code");
    const error = req.nextUrl.searchParams.get("error");
    const stateToken = req.nextUrl.searchParams.get("state");
    if (error) return handleError(error);
    // Start of OAuth: no code yet → this is the "connect" entry point. Hand back
    // a tiny HTML document that jumps to Instagram from its own load instead of
    // redirecting. A 302 does not help: iOS and Chrome match universal/app links
    // against the *final* URL of a user-initiated navigation, redirect chains
    // included, so a tapped link that lands on www.instagram.com opens the
    // Instagram app — which expects a profile, not an OAuth flow, and breaks it.
    // The tap's gesture token dies when this document commits, so the hop below
    // is script-initiated and left in the browser on both platforms.
    if (!accessCode) {
      if (!stateToken) return handleError("Invalid request");
      return getAuthorizationHandoff(getInstagramAuthorizationURL(stateToken));
    }
    if (!stateToken) return handleError("Invalid request");
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
    return NextResponse.redirect(redirectURL);
  };
};
