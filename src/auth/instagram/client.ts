import { EnvVariable, getEnv } from "@/src/env";

/**
 * Creates a function that builds the Instagram OAuth authorization URL for a given state token.
 * The state token is typically the user's access token, used to link the Instagram account to the logged-in user.
 *
 * @param redirectURL - The OAuth redirect URI registered with Instagram (e.g. `NEXT_PUBLIC_INSTAGRAM_AUTH_ENDPOINT`).
 * @returns A function `(stateToken: string) => string` that returns the full authorization URL.
 *
 * @example
 * ```ts
 * import { getInstagramAuthorizationURLSetup } from "naystack/auth/instagram/client";
 *
 * const getAuthURL = getInstagramAuthorizationURLSetup("/api/instagram");
 * const url = getAuthURL(userAccessToken);
 * // => "https://www.instagram.com/oauth/authorize?client_id=...&state=...&redirect_uri=..."
 * window.location.href = url;
 * ```
 *
 * @category Auth
 */
export const getInstagramAuthorizationURLSetup =
  (redirectURL: string) => (token: string) =>
    `https://www.instagram.com/oauth/authorize?client_id=${getEnv(
      EnvVariable.INSTAGRAM_CLIENT_ID,
    )}&response_type=code&enable_fb_login=0&force_authentication=1&scope=instagram_business_basic&state=${token}&redirect_uri=${redirectURL}`;
