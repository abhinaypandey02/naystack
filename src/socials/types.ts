/**
 * Platform-neutral shapes every social provider maps its API onto: one row for a
 * connected account, one for a piece of its content. Raw per-platform payloads
 * (`InstagramUser`, `ThreadsPost`, …) stay available for anything these flatten.
 *
 * @module
 */

/**
 * A platform a user can connect an account on. Values double as URL path
 * segments, so a route mounted at `/api/social/[platform]` matches them verbatim.
 *
 * @category Socials
 */
export enum SocialPlatform {
  Instagram = "instagram",
  YouTube = "youtube",
  TikTok = "tiktok",
}

/**
 * What a piece of content is. Each adapter maps its platform's own vocabulary
 * (Instagram's uppercase `IMAGE` / `VIDEO` / `CAROUSEL_ALBUM`, a reel being a
 * `VIDEO`) onto these three.
 *
 * @category Socials
 */
export enum SocialMediaKind {
  Image = "image",
  Video = "video",
  Carousel = "carousel",
}

/**
 * A connected account's profile and audience.
 *
 * @property platformUserId - The platform's own id. Stable across renames — key on it, not `username`. `null` when the platform doesn't return one.
 * @property username - Public handle. Mutable, and a freed handle can be taken by someone else.
 * @property avatar - Usually a signed CDN URL that expires; copy it to your own storage.
 * @property followers - Subscribers on YouTube, followers elsewhere.
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
  followers: number;
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
