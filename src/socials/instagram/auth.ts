import { EnvVariable, getEnv } from "@/src/env";

/**
 * Permissions requestable during Instagram Login OAuth. `instagram_business_basic`
 * is enough to read a profile; publishing needs `instagram_business_content_publish`.
 *
 * Widening the scopes only affects users who authorize afterwards — tokens already
 * stored keep the permissions they were granted, so existing users must reconnect.
 *
 * @category Socials
 */
export type InstagramScope =
  | "instagram_business_basic"
  | "instagram_business_content_publish"
  | "instagram_business_manage_messages"
  | "instagram_business_manage_comments"
  | "instagram_business_manage_insights";

/**
 * Builds the Instagram OAuth authorization URL.
 *
 * **Server-only** — reads the non-public `INSTAGRAM_CLIENT_ID`. The client id still
 * ends up in the URL the browser follows; it is simply built here rather than
 * shipped in the client bundle.
 *
 * @param state - Passed back by Instagram on the callback; typically the logged-in user's access token.
 * @param redirectURI - Where Instagram sends the user back. Must match a URI registered with Meta verbatim.
 * @param scopes - Default: `["instagram_business_basic"]`.
 *
 * @category Socials
 */
// Two details — verified in production — are the only thing keeping mobile
// browsers from opening this URL in the Instagram app instead of following it,
// which strands the user in the app and means the redirect_uri is never called.
// Both come from Instagram's own apple-app-site-association
// (https://www.instagram.com/.well-known/apple-app-site-association):
//
//   1. The `#weblink` fragment. Its first rule is
//      `{"#":"weblink","exclude":true}` — Meta's deliberate opt-out, matched
//      before every path rule, so any instagram.com URL carrying that fragment is
//      excluded from universal links. Fragments are never sent to the server, so
//      Instagram receives exactly the same request either way.
//   2. The trailing slash on `/oauth/authorize/`. A later rule excludes
//      `/oauth/authorize/*` — literally `/oauth/authorize/` plus anything — so the
//      slashless spelling misses it by one character and falls through to the
//      catch-all `/*` rule. Both spellings serve the same dialog.
export const getInstagramAuthorizationURL = (
  state: string,
  redirectURI: string,
  scopes: InstagramScope[] = ["instagram_business_basic"],
) =>
  `https://www.instagram.com/oauth/authorize/?client_id=${getEnv(
    EnvVariable.INSTAGRAM_CLIENT_ID,
  )}&response_type=code&enable_fb_login=0&force_authentication=1&scope=${scopes.join(",")}&state=${state}&redirect_uri=${redirectURI}#weblink`;

/**
 * Exchanges an OAuth code for a long-lived Instagram access token.
 *
 * @param code - Authorization code from the callback.
 * @param redirectURI - The same URI used to obtain the code.
 * @returns `{ accessToken, userId, expiresIn, permissions }`, or `undefined` if either exchange failed.
 *
 * @category Socials
 */
export async function getLongLivedInstagramToken(
  code: string,
  redirectURI: string,
) {
  const formData = new FormData();
  formData.set("client_id", getEnv(EnvVariable.INSTAGRAM_CLIENT_ID));
  formData.set("client_secret", getEnv(EnvVariable.INSTAGRAM_CLIENT_SECRET));
  formData.set("grant_type", "authorization_code");
  formData.set("redirect_uri", redirectURI);
  formData.set("code", code);
  const shortRes = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    body: formData,
  });
  if (!shortRes.ok) return undefined;
  const shortResData = (await shortRes.json()) as {
    access_token?: string;
    user_id?: string;
    permissions?: string[];
  };
  if (!shortResData.access_token) return undefined;

  const longRes = await fetch(
    `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&access_token=${shortResData.access_token}&client_secret=${getEnv(EnvVariable.INSTAGRAM_CLIENT_SECRET)}`,
  );
  if (!longRes.ok) return undefined;
  const longResData = (await longRes.json()) as {
    access_token: string;
    expires_in: number;
  };
  return {
    accessToken: longResData.access_token,
    userId: shortResData.user_id,
    expiresIn: longResData.expires_in,
    permissions: shortResData.permissions,
  };
}

/**
 * Refreshes a long-lived Instagram token.
 *
 * @returns `{ accessToken, expiresIn }` (seconds), or `undefined` if the refresh failed.
 *
 * @category Socials
 */
export async function refreshInstagramAccessToken(token: string) {
  const request = await fetch(
    `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`,
  );
  const response = (await request.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!response.access_token) return undefined;
  return {
    accessToken: response.access_token,
    expiresIn: response.expires_in,
  };
}
