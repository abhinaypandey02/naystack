import { NextRequest, NextResponse } from "next/server";

import { getUserIdFromAccessToken } from "@/src/auth/email/token";
import { SocialProvider } from "@/src/socials/provider";
import {
  SocialPlatform,
  SocialProfile,
  SocialTokens,
} from "@/src/socials/types";

// The OAuth `state` is the caller's token, or — when the entry point was given
// a `returnTo` — a base64url JSON envelope carrying both. Decoding falls back to
// the bare-token reading, so nothing changes for callers that never send one.
type State = { token: string | null; returnTo: string | null };

const encodeState = (token: string, returnTo: string | null) =>
  returnTo
    ? Buffer.from(JSON.stringify({ t: token, r: returnTo })).toString(
        "base64url",
      )
    : token;

function decodeState(params: URLSearchParams): State {
  const state = params.get("state");
  // The entry point carries `returnTo` as its own param; the callback carries
  // it inside `state`.
  const returnTo = params.get("returnTo");
  if (!state) return { token: null, returnTo };
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(state, "base64url").toString(),
    );
    if (
      parsed &&
      typeof parsed === "object" &&
      "t" in parsed &&
      typeof parsed.t === "string"
    )
      return {
        token: parsed.t,
        returnTo:
          "r" in parsed && typeof parsed.r === "string" ? parsed.r : returnTo,
      };
  } catch {
    // A bare token isn't JSON; that's the common case.
  }
  return { token: state, returnTo };
}

const withError = (url: string, message: string) =>
  `${url}${url.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`;

/**
 * A freshly connected account, handed to `onConnect`.
 *
 * @property userId - Your app's user id from the state token; `null` when that token was invalid or expired.
 *
 * @category Socials
 */
export interface SocialConnection {
  platform: SocialPlatform;
  profile: SocialProfile;
  tokens: SocialTokens;
  userId: number | null;
}

/**
 * Options for {@link setupSocialAuth}.
 *
 * @property endpoint - Base URL this route is mounted at, e.g. `"https://yourapp.com/api/social"`. Each provider's redirect URI is `<endpoint>/<platform lowercased>` and must be registered with that platform verbatim.
 * @property onConnect - Return a string to show as an error (redirects to `errorRedirectURL`); return `void` on success.
 * @property redirectURL - Where a successful connect lands, unless the start request carried `returnTo`.
 * @property scopes - Per-platform permissions; each provider has its own default.
 *
 * @category Socials
 */
export interface SetupSocialAuthOptions {
  providers: SocialProvider[];
  endpoint: string;
  onConnect: (connection: SocialConnection) => Promise<string | void>;
  redirectURL: string;
  errorRedirectURL: string;
  scopes?: Partial<Record<SocialPlatform, string[]>>;
}

/**
 * One OAuth route for every platform a user can connect.
 *
 * Mount the GET handler on a dynamic segment — `app/api/social/[platform]/route.ts`
 * — and `/api/social/instagram`, `/api/social/youtube`, … are the same handler. It
 * serves both the connect entry point (`?state`, no code → 302 to the platform's
 * authorize URL) and the callback (`?code`).
 *
 * A native client can add `&returnTo=yourapp://profile` to the entry point: it
 * rides along in the OAuth `state` and replaces `redirectURL` (and, with
 * `?error=`, `errorRedirectURL`) at the end, so an auth session gets its
 * custom-scheme callback instead of relying on a universal link to reopen the app.
 *
 * @example
 * ```ts
 * // app/api/social/[platform]/route.ts
 * import { InstagramProvider, setupSocialAuth } from "naystack/socials";
 *
 * export const { GET } = setupSocialAuth({
 *   providers: [InstagramProvider],
 *   endpoint: "https://yourapp.com/api/social",
 *   redirectURL: "/profile",
 *   errorRedirectURL: "/signup",
 *   onConnect: async ({ platform, profile, tokens, userId }) => {
 *     if (!userId) return "You are not logged in";
 *     await saveSocialAccount(userId, platform, profile, tokens);
 *   },
 * });
 * ```
 *
 * @category Socials
 */
export function setupSocialAuth({
  providers,
  endpoint,
  onConnect,
  redirectURL,
  errorRedirectURL,
  scopes,
}: SetupSocialAuthOptions) {
  const GET = async (
    req: NextRequest,
    ctx: { params: Promise<{ platform: string }> },
  ) => {
    const { platform } = await ctx.params;
    const { token, returnTo } = decodeState(req.nextUrl.searchParams);
    const handleError = (message: string) =>
      NextResponse.redirect(withError(returnTo ?? errorRedirectURL, message));

    // URLs are lowercase; the enum's values are the platform's own spelling.
    const provider = providers.find(
      (p) => p.platform.toLowerCase() === platform.toLowerCase(),
    );
    if (!provider) return handleError("Unsupported platform");

    const code = req.nextUrl.searchParams.get("code");
    const error = req.nextUrl.searchParams.get("error");
    if (error) return handleError(error);
    if (!token) return handleError("Invalid request");

    const redirectURI = `${endpoint}/${provider.platform.toLowerCase()}`;
    if (!code) {
      return NextResponse.redirect(
        provider.auth.authorizationURL({
          state: encodeState(token, returnTo),
          redirectURI,
          scopes: scopes?.[provider.platform],
        }),
        302,
      );
    }

    try {
      const exchanged = await provider.auth.exchangeCode({ code, redirectURI });
      if (!exchanged) return handleError("Couldn't connect your account");
      const { platformUserId, ...tokens } = exchanged;

      const profile = await provider.fetchProfile(tokens.accessToken);
      if (!profile) return handleError("Couldn't read your profile");

      const errorMessage = await onConnect({
        platform: provider.platform,
        profile: {
          ...profile,
          platformUserId: profile.platformUserId ?? platformUserId,
        },
        tokens,
        userId: getUserIdFromAccessToken(token),
      });
      if (errorMessage) return handleError(errorMessage);
      return NextResponse.redirect(returnTo ?? redirectURL);
    } catch (e) {
      // A thrown error would otherwise surface as a bare 500 — which an in-app
      // browser tab can only offer as a download.
      console.error(`[naystack] ${provider.platform} connect:`, e);
      return handleError("Couldn't connect your account");
    }
  };

  return { GET };
}
