import {
  SocialPlatform,
  SocialPost,
  SocialProfile,
  SocialTokens,
} from "@/src/socials/types";

/**
 * One platform's implementation of connect, read profile, read content.
 *
 * A plain object with no per-instance state — credentials come from the
 * environment at call time, tokens are arguments — so each platform exports one
 * ready-made constant. `InstagramProvider` is the reference implementation.
 *
 * Capability is method presence: a platform that can't refresh tokens omits
 * `refresh`, one with no content-listing API omits `fetchMedia`, and callers
 * narrow with `if (provider.fetchMedia)`. This describes the platform, not a
 * token — a token missing a scope still fails at runtime with a `null` return.
 *
 * @property auth.authorizationURL - `state` comes back on the callback; `redirectURI` must match what the platform has registered.
 * @property auth.exchangeCode - Trades the callback `code` for tokens. `platformUserId` is `null` on platforms whose token response carries no id (Google); the route then takes it from `fetchProfile`.
 * @property auth.refresh - Omitted by platforms whose tokens don't expire or can't be refreshed.
 * @property fetchMedia - Omitted by platforms with no content-listing API.
 * @property profileURL - Public profile link for a handle. Platform knowledge, not a capability, so every adapter has one.
 *
 * @example
 * ```ts
 * import { InstagramProvider } from "naystack/socials";
 *
 * const profile = await InstagramProvider.fetchProfile(accessToken);
 * const posts = await InstagramProvider.fetchMedia?.(accessToken, { limit: 12 });
 * ```
 *
 * @category Socials
 */
export type SocialProvider = {
  platform: SocialPlatform;
  auth: {
    authorizationURL: (input: {
      state: string;
      redirectURI: string;
      scopes?: string[];
    }) => string;
    exchangeCode: (input: {
      code: string;
      redirectURI: string;
    }) => Promise<(SocialTokens & { platformUserId: string | null }) | null>;
    refresh?: (tokens: SocialTokens) => Promise<SocialTokens | null>;
  };
  fetchProfile: (accessToken: string) => Promise<SocialProfile | null>;
  profileURL: (username: string) => string;
  fetchMedia?: (
    accessToken: string,
    options?: { limit?: number },
  ) => Promise<SocialPost[]>;
};
