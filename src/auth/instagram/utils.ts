import { NextResponse } from "next/server";

import { EnvVariable, getEnv } from "@/src/env";

/**
 * How long the handoff page waits before navigating to the provider.
 *
 * The wait is the point. Mobile browsers hand a URL to a provider's native app
 * based on how closely the navigation is tied to the tap that started it — a
 * tapped link, a 302 from one, and a redirect fired the instant a page loads all
 * still count as that tap, and all three were observed opening the Instagram app
 * mid-OAuth. A timer this long is unambiguously its own navigation.
 */
const HANDOFF_DELAY_MS = 1500;

/**
 * Builds the interstitial document that carries the browser from our origin to a
 * provider's authorization page: it renders, waits {@link HANDOFF_DELAY_MS}, then
 * replaces itself with `authorizationURL`.
 *
 * `location.replace` keeps the interstitial out of session history, so Back from
 * the provider returns to the page that started the flow. The `noscript` meta
 * refresh is a fallback, not the primary path.
 *
 * @param authorizationURL - Provider authorization URL to hand the browser off to
 * @param providerName - Shown to the user while waiting, e.g. `"Instagram"`
 * @returns HTML response that redirects client-side after a delay
 *
 * @category Auth
 */
export function getAuthorizationHandoff(
  authorizationURL: string,
  providerName: string,
) {
  // The URL carries caller-supplied input (the state token), so escape it for both
  // the script and the attribute context rather than interpolating it raw.
  const scriptSafeURL = JSON.stringify(authorizationURL).replace(
    /</g,
    "\\u003c",
  );
  const attributeSafeURL = authorizationURL
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
  const safeProviderName = providerName
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Redirecting to ${safeProviderName}…</title><style>body{margin:0;min-height:100dvh;display:flex;align-items:center;justify-content:center;font:500 15px/1.5 system-ui,-apple-system,sans-serif;color:#111}</style><script>setTimeout(function(){location.replace(${scriptSafeURL})},${HANDOFF_DELAY_MS})</script><noscript><meta http-equiv="refresh" content="2;url=${attributeSafeURL}"></noscript></head><body><p>Redirecting to ${safeProviderName}…</p></body></html>`,
    {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        // The token is in the URL; keep it off the provider's referer log.
        "referrer-policy": "no-referrer",
      },
    },
  );
}

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
// The trailing slash on `/oauth/authorize/` is load-bearing on iOS. Instagram's
// apple-app-site-association excludes `/oauth/authorize/*` from universal links —
// Meta does not want the app swallowing its own OAuth dialog — but that pattern
// means the literal `/oauth/authorize/` followed by anything, so the slashless
// `/oauth/authorize` misses the exclusion by one character and is claimed by the
// catch-all `/*` rule instead, opening the Instagram app mid-flow. Both spellings
// serve the same dialog; only this one stays in the browser.
export const getInstagramAuthorizationURL = (token: string) =>
    `https://www.instagram.com/oauth/authorize/?client_id=${getEnv(
        EnvVariable.INSTAGRAM_CLIENT_ID,
    )}&response_type=code&enable_fb_login=0&force_authentication=1&scope=instagram_business_basic&state=${token}&redirect_uri=${getEnv(EnvVariable.NEXT_PUBLIC_INSTAGRAM_AUTH_ENDPOINT)}`;
