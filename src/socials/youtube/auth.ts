// Deep import, not `from "googleapis"`: the root barrel loads all 317 API
// clients (536ms / 170MB at require time) for the one used here.
import { auth } from "googleapis/build/src/apis/youtube";

import { EnvVariable, getEnv } from "@/src/env";

/**
 * Permissions requestable during YouTube OAuth. `youtube.readonly` covers the
 * channel profile and public uploads; nothing here needs more.
 *
 * @category Socials
 */
export type YouTubeScope =
  | "https://www.googleapis.com/auth/youtube.readonly"
  | "https://www.googleapis.com/auth/youtube"
  | "https://www.googleapis.com/auth/youtube.force-ssl"
  | "https://www.googleapis.com/auth/yt-analytics.readonly";

const DEFAULT_SCOPES: YouTubeScope[] = [
  "https://www.googleapis.com/auth/youtube.readonly",
];

/** A fresh client per call: credentials are read at call time and nothing is cached. */
const youtubeOAuthClient = (redirectURI?: string) =>
  new auth.OAuth2({
    clientId: getEnv(EnvVariable.YOUTUBE_CLIENT_ID),
    clientSecret: getEnv(EnvVariable.YOUTUBE_CLIENT_SECRET),
    redirectUri: redirectURI,
  });

// `expiry_date` is epoch ms already, not an `expires_in` offset.
const toExpiry = (credentials: {
  expiry_date?: number | null;
  scope?: string;
}) => ({
  expiresAt: credentials.expiry_date
    ? new Date(credentials.expiry_date)
    : undefined,
  scopes: credentials.scope?.split(" "),
});

/**
 * Builds the Google OAuth authorization URL for a YouTube connection.
 *
 * **Server-only** — reads the non-public `YOUTUBE_CLIENT_ID`.
 *
 * @param state - Passed back by Google on the callback; typically the logged-in user's access token.
 * @param redirectURI - Must match a URI registered on the Google Cloud OAuth client verbatim.
 * @param scopes - Default: `["https://www.googleapis.com/auth/youtube.readonly"]`.
 *
 * @category Socials
 */
// `access_type=offline` + `prompt=consent` together are what make Google return
// a refresh_token — and it only does so on a consent screen, so a reconnecting
// user without `prompt=consent` comes back with an access token that dies in an
// hour and no way to renew it.
export const getYouTubeAuthorizationURL = (
  state: string,
  redirectURI: string,
  scopes: YouTubeScope[] = DEFAULT_SCOPES,
) =>
  youtubeOAuthClient(redirectURI).generateAuthUrl({
    scope: scopes,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,
    state,
  });

/**
 * Exchanges an OAuth code for YouTube tokens.
 *
 * @param code - Authorization code from the callback.
 * @param redirectURI - The same URI used to obtain the code.
 * @returns `{ accessToken, refreshToken, expiresAt, scopes }`, or `undefined` if Google returned no access token.
 *
 * @category Socials
 */
export async function exchangeYouTubeCode(code: string, redirectURI: string) {
  const { tokens } = await youtubeOAuthClient(redirectURI).getToken(code);
  if (!tokens.access_token) return undefined;
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? undefined,
    ...toExpiry(tokens),
  };
}

const isInvalidGrant = (error: unknown) =>
  (error as { response?: { data?: { error?: string } } }).response?.data
    ?.error === "invalid_grant";

/**
 * Trades a refresh token for a new access token.
 *
 * @returns `{ accessToken, expiresAt, scopes }` — never a `refreshToken`, Google
 *   doesn't rotate it — or `null` when the grant was revoked or expired
 *   (`invalid_grant`). Any other failure (network, 5xx, quota) throws so a
 *   caller counting consecutive failures doesn't mistake an outage for a
 *   revocation.
 *
 * @category Socials
 */
export async function refreshYouTubeToken(refreshToken: string) {
  const client = youtubeOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });
  try {
    const { credentials } = await client.refreshAccessToken();
    if (!credentials.access_token) return null;
    // `credentials.refresh_token` is the one we set, copied back — not returned.
    return { accessToken: credentials.access_token, ...toExpiry(credentials) };
  } catch (error) {
    if (isInvalidGrant(error)) return null;
    throw error;
  }
}
