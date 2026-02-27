import { EnvVariable, getEnv } from "@/src/env";

/**
 * Builds the Instagram OAuth authorization URL for the given state token.
 * The state token is passed back by Instagram after authorization and is used to link
 * the Instagram account to the logged-in user.
 *
 * Reads `INSTAGRAM_CLIENT_ID` and `NEXT_PUBLIC_INSTAGRAM_AUTH_ENDPOINT` from the environment.
 *
 * @param token - The state token to embed in the authorization URL (typically the user's session or access token).
 * @returns The full Instagram OAuth authorization URL.
 *
 * @example
 * ```ts
 * import { getInstagramAuthorizationURL } from "naystack/auth/instagram/client";
 *
 * const url = getInstagramAuthorizationURL(userAccessToken);
 * // => "https://www.instagram.com/oauth/authorize?client_id=...&state=...&redirect_uri=..."
 * window.location.href = url;
 * ```
 *
 * @category Auth
 */
export const getInstagramAuthorizationURL = (token: string) =>
  `https://www.instagram.com/oauth/authorize?client_id=${getEnv(
    EnvVariable.INSTAGRAM_CLIENT_ID,
  )}&response_type=code&enable_fb_login=0&force_authentication=1&scope=instagram_business_basic&state=${token}&redirect_uri=${getEnv(EnvVariable.NEXT_PUBLIC_INSTAGRAM_AUTH_ENDPOINT)}`;
