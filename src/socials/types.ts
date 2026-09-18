/**
 * Platform-neutral shapes every social provider maps its API onto: one row for a
 * connected account, one for a piece of its content. Raw per-platform payloads
 * (`InstagramUser`, `ThreadsPost`, …) stay available for anything these flatten.
 *
 * **Import these from `naystack/socials/types`, never from `naystack/socials`** —
 * which is why that barrel doesn't re-export them. The build runs with
 * `splitting: false`, so the barrel inlines a private copy of this module: its
 * `SocialPlatform` would be a second enum object with the same values, and
 * anything identity-keyed rejects it (type-graphql's enum registry answers
 * "Cannot determine GraphQL input type"). This entry pulls in no server code, so
 * client bundles can import it too.
 *
 * @module
 */

/**
 * A platform a user can connect an account on. The value is the platform's name
 * as it is written, so it reads the same in a database column, a GraphQL enum
 * and a UI label; `setupSocialAuth` matches the `[platform]` route segment
 * case-insensitively, so URLs stay lowercase.
 *
 * @category Socials
 */
export enum SocialPlatform {
  Instagram = "Instagram",
  Youtube = "Youtube",
  TikTok = "TikTok",
}

/** Where a handle's public profile lives, per platform. */
const PROFILE_URL: Record<SocialPlatform, (username: string) => string> = {
  [SocialPlatform.Instagram]: (username) => `https://instagram.com/${username}`,
  // A channel with no handle is stored under its `UC…` id instead.
  [SocialPlatform.Youtube]: (username) =>
    username.startsWith("UC") && username.length === 24
      ? `https://youtube.com/channel/${username}`
      : `https://youtube.com/@${username}`,
  [SocialPlatform.TikTok]: (username) => `https://tiktok.com/@${username}`,
};

/**
 * The public profile link for a handle. `SocialProvider.profileURL` is the same
 * thing reached through an adapter; this is for code that holds a stored account
 * row rather than a provider — a client bundle, or a query result.
 *
 * @category Socials
 */
export const socialProfileURL = (platform: SocialPlatform, username: string) =>
  PROFILE_URL[platform](username);

/**
 * What a piece of content is. Each adapter maps its platform's own vocabulary
 * (Instagram's uppercase `IMAGE` / `VIDEO` / `CAROUSEL_ALBUM`, a reel being a
 * `VIDEO`) onto these three.
 *
 * @category Socials
 */
export enum SocialMediaKind {
  Image = "Image",
  Video = "Video",
  Carousel = "Carousel",
}

/**
 * A connected account's profile and audience.
 *
 * @property platformUserId - The platform's own id. Stable across renames — key on it, not `username`. `null` when the platform doesn't return one.
 * @property username - Public handle. Mutable, and a freed handle can be taken by someone else.
 * @property avatar - Usually a signed CDN URL that expires; copy it to your own storage.
 * @property followers - Subscribers on YouTube, followers elsewhere. `null` when the platform hides the count (a YouTube channel can); never `0` in that case, so a follower gate can tell "unknown" from "none".
 * @property metadata - Platform extras, display-only: keys differ per platform, so never filter or sort on them.
 *
 * @category Socials
 */
export type SocialProfile = {
  platform: SocialPlatform;
  platformUserId: string | null;
  username: string;
  displayName: string | null;
  avatar: string | null;
  followers: number | null;
  contentCount: number;
  metadata: Record<string, unknown>;
};

/**
 * One piece of content from a connected account.
 *
 * Every metric is `number | null`, and `null` always means *the platform did not
 * give us this* — hidden, unrequested, or nonexistent on that platform. Adapters
 * never substitute `0`: "nobody liked it" and "likes are hidden" are different
 * facts, and only the caller knows which its averages should skip.
 *
 * @property platformMediaId - Unique within a platform, not across them.
 * @property thumbnail - Usually a signed CDN URL that expires; copy it to your own storage.
 * @property publishedAt - ISO 8601.
 * @property metadata - Platform extras, display-only, same contract as {@link SocialProfile}.
 *
 * @category Socials
 */
export type SocialPost = {
  platform: SocialPlatform;
  platformMediaId: string;
  permalink: string;
  thumbnail: string | null;
  mediaURL: string | null;
  caption: string | null;
  kind: SocialMediaKind;
  publishedAt: string;
  likes: number | null;
  comments: number | null;
  views: number | null;
  shares: number | null;
  metadata: Record<string, unknown>;
};

/**
 * Credentials for a connected account. Instagram issues a long-lived
 * `accessToken` refreshed in place; Google and TikTok pair a short one with a
 * `refreshToken`. One shape covers both.
 *
 * @property expiresAt - Absent when the platform doesn't say.
 * @property scopes - Permissions actually granted. A token can be valid yet lack the scope for a given call.
 *
 * @category Socials
 */
export type SocialTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scopes?: string[];
};
