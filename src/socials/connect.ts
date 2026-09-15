import { NextRequest, NextResponse } from "next/server";

import { getUserIdFromAccessToken } from "@/src/auth/email/token";
import { SocialProvider } from "@/src/socials/provider";
import {
  SocialPlatform,
  SocialProfile,
  SocialTokens,
} from "@/src/socials/types";

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
 * @property endpoint - Base URL this route is mounted at, e.g. `"https://yourapp.com/api/social"`. Each provider's redirect URI is `<endpoint>/<platform>` and must be registered with that platform verbatim.
 * @property onConnect - Return a string to show as an error (redirects to `errorRedirectURL`); return `void` on success.
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
  const handleError = (message: string) =>
    NextResponse.redirect(`${errorRedirectURL}?error=${message}`);

  const GET = async (
    req: NextRequest,
    ctx: { params: Promise<{ platform: string }> },
  ) => {
    const { platform } = await ctx.params;
    const provider = providers.find((p) => p.platform === platform);
    if (!provider) return handleError("Unsupported platform");

    const code = req.nextUrl.searchParams.get("code");
    const error = req.nextUrl.searchParams.get("error");
    const state = req.nextUrl.searchParams.get("state");
    if (error) return handleError(error);
    if (!state) return handleError("Invalid request");

    const redirectURI = `${endpoint}/${provider.platform}`;
    if (!code) {
      return NextResponse.redirect(
        provider.auth.authorizationURL({
          state,
          redirectURI,
          scopes: scopes?.[provider.platform],
        }),
        302,
      );
    }

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
      userId: getUserIdFromAccessToken(state),
    });
    if (errorMessage) return handleError(errorMessage);
    return NextResponse.redirect(redirectURL);
  };

  return { GET };
}
