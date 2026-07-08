import { EnvVariable, getEnv } from "@/src/env";

/**
 * Exchanges a long-lived Instagram token for a refreshed token.
 * @param token - Current long-lived access token
 * @returns New access token or undefined
 */
export async function getRefreshedInstagramAccessToken(token: string) {
  const request = await fetch(
    `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`,
  );
  const response = (await request.json()) as { access_token?: string };
  return response.access_token;
}

/**
 * Exchanges an OAuth code for a long-lived Instagram access token.
 * @param code - OAuth authorization code from redirect
 * @param redirectURL - Registered redirect URI
 * @param clientId - Instagram app client id
 * @param clientSecret - Instagram app client secret
 * @returns Object with accessToken and userId, or undefined
 */
export async function getLongLivedToken(
  code: string,
  redirectURL: string,
  clientId: string,
  clientSecret: string,
) {
  const formData = new FormData();
  formData.set("client_id", clientId);
  formData.set("client_secret", clientSecret);
  formData.set("grant_type", "authorization_code");
  formData.set("redirect_uri", redirectURL);
  formData.set("code", code);
  const shortRes = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    body: formData,
  });
  if (shortRes.ok) {
    const shortResData = (await shortRes.json()) as {
      access_token: string;
      user_id: string;
      permissions: string[];
    };
    if (shortResData.access_token) {
      const shortLivedToken = shortResData.access_token;
      const longRes = await fetch(
        `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&access_token=${shortLivedToken}&client_secret=${getEnv(EnvVariable.INSTAGRAM_CLIENT_SECRET)}`,
      );
      if (longRes.ok) {
        const longResData = (await longRes.json()) as {
          access_token: string;
          token_type: "bearer";
          expires_in: number;
        };
        return {
          accessToken: longResData.access_token,
          userId: shortResData.user_id,
        };
      }
    }
  }
}

/**
 * Builds the Instagram OAuth authorization URL for the given state token.
 * The state token is passed back by Instagram after authorization and is used to link
 * the Instagram account to the logged-in user.
 *
 * Reads `INSTAGRAM_CLIENT_ID` and `NEXT_PUBLIC_INSTAGRAM_AUTH_ENDPOINT` from the environment.
 *
 * **Server-only** — reads the non-public `INSTAGRAM_CLIENT_ID`, so it must be
 * called from server code (e.g. the Instagram auth route), not the client. The
 * OAuth `client_id` still ends up in the redirect URL the browser follows; it is
 * simply built on the server instead of shipped in the client bundle.
 *
 * @param token - The state token to embed in the authorization URL (typically the user's session or access token).
 * @returns The full Instagram OAuth authorization URL.
 *
 * @example
 * ```ts
 * // In a server route handler:
 * import { getInstagramAuthorizationURL } from "naystack/auth";
 *
 * return NextResponse.redirect(getInstagramAuthorizationURL(state), 302);
 * ```
 *
 * @category Auth
 */
export const getInstagramAuthorizationURL = (token: string) =>
    `https://www.instagram.com/oauth/authorize?client_id=${getEnv(
        EnvVariable.INSTAGRAM_CLIENT_ID,
    )}&response_type=code&enable_fb_login=0&force_authentication=1&scope=instagram_business_basic&state=${token}&redirect_uri=${getEnv(EnvVariable.NEXT_PUBLIC_INSTAGRAM_AUTH_ENDPOINT)}`;
