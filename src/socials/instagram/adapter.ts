import { SocialProvider } from "@/src/socials/provider";
import {
  SocialMediaKind,
  SocialPlatform,
  SocialPost,
  socialProfileURL,
} from "@/src/socials/types";

import {
  getInstagramAuthorizationURL,
  getLongLivedInstagramToken,
  InstagramScope,
  refreshInstagramAccessToken,
} from "./auth";
import { getInstagramMedia, getInstagramUser } from "./getters";

/** Fields beyond the getters' defaults that the normalized shapes need. */
const PROFILE_FIELDS = [
  "id",
  "user_id",
  "username",
  "name",
  "profile_picture_url",
  "followers_count",
  "media_count",
];

const MEDIA_FIELDS = [
  "id",
  "caption",
  "media_type",
  "media_url",
  "permalink",
  "thumbnail_url",
  "timestamp",
  "like_count",
  "comments_count",
];

type RawProfile = {
  id?: string;
  user_id?: string;
  username?: string;
  name?: string;
  profile_picture_url?: string;
  followers_count?: number;
  media_count?: number;
};

type RawMedia = {
  id: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  permalink: string;
  thumbnail_url?: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
};

const expiresAt = (seconds?: number) =>
  seconds ? new Date(Date.now() + seconds * 1000) : undefined;

// Instagram returns media_type UPPERCASE; any other casing silently makes every
// post an image. A reel is a VIDEO, not a kind of its own.
function toKind(mediaType?: string) {
  if (mediaType === "VIDEO") return SocialMediaKind.Video;
  if (mediaType === "CAROUSEL_ALBUM") return SocialMediaKind.Carousel;
  return SocialMediaKind.Image;
}

function toPost(media: RawMedia): SocialPost {
  const kind = toKind(media.media_type);
  return {
    platform: SocialPlatform.Instagram,
    platformMediaId: media.id,
    permalink: media.permalink,
    // A video's `media_url` is the .mp4 itself, so it is never a stand-in for a
    // missing poster frame — better no thumbnail than one that can't render.
    thumbnail:
      media.thumbnail_url ??
      (kind === SocialMediaKind.Video ? null : (media.media_url ?? null)),
    mediaURL: media.media_url ?? null,
    caption: media.caption ?? null,
    kind,
    publishedAt: media.timestamp,
    likes: media.like_count ?? null,
    comments: media.comments_count ?? null,
    // Both need the Insights API; the basic media fields carry neither.
    views: null,
    shares: null,
    metadata: {},
  };
}

/**
 * Instagram as a normalized {@link SocialProvider}.
 *
 * A ready-made singleton — import and call it, there is nothing to construct.
 * Credentials are read from the environment inside the `auth` methods, so
 * `fetchProfile` and `fetchMedia` need only a token and work in a process that
 * has no Instagram OAuth configuration at all.
 *
 * Wraps the platform-specific helpers rather than replacing them:
 * {@link getInstagramUser} and {@link getInstagramMedia} remain the way to reach
 * fields this normalization drops.
 *
 * Requires env vars for `auth` only: `INSTAGRAM_CLIENT_ID`, `INSTAGRAM_CLIENT_SECRET`.
 *
 * @example
 * ```ts
 * import { InstagramProvider } from "naystack/socials";
 *
 * const profile = await InstagramProvider.fetchProfile(accessToken);
 * const posts = await InstagramProvider.fetchMedia?.(accessToken, { limit: 6 });
 * ```
 *
 * @category Socials
 */
export const InstagramProvider: SocialProvider = {
  platform: SocialPlatform.Instagram,

  auth: {
    authorizationURL: ({ state, redirectURI, scopes }) =>
      getInstagramAuthorizationURL(
        state,
        redirectURI,
        scopes as InstagramScope[] | undefined,
      ),

    exchangeCode: async ({ code, redirectURI }) => {
      const result = await getLongLivedInstagramToken(code, redirectURI);
      if (!result) {
        console.error("[naystack] Instagram code exchange returned no token");
        return null;
      }
      return {
        accessToken: result.accessToken,
        platformUserId: result.userId || null,
        expiresAt: expiresAt(result.expiresIn),
        scopes: result.permissions,
      };
    },

    refresh: async ({ accessToken }) => {
      const refreshed = await refreshInstagramAccessToken(accessToken);
      if (!refreshed) return null;
      return {
        accessToken: refreshed.accessToken,
        expiresAt: expiresAt(refreshed.expiresIn),
      };
    },
  },

  profileURL: (username) =>
    socialProfileURL(SocialPlatform.Instagram, username),

  fetchProfile: async (accessToken) => {
    const user = await getInstagramUser<RawProfile>(
      accessToken,
      undefined,
      PROFILE_FIELDS,
    );
    if (!user?.username) return null;
    return {
      platform: SocialPlatform.Instagram,
      // `user_id` is what the OAuth exchange hands back, so preferring it keeps
      // one account's id identical however it was read.
      platformUserId: user.user_id || user.id || null,
      username: user.username,
      displayName: user.name ?? null,
      avatar: user.profile_picture_url ?? null,
      followers: user.followers_count ?? null,
      contentCount: user.media_count ?? 0,
      metadata: {},
    };
  },

  fetchMedia: async (accessToken, options) => {
    const result = await getInstagramMedia<RawMedia>(
      accessToken,
      MEDIA_FIELDS,
      options?.limit,
    );
    // An account with nothing posted answers `{ data: [] }`; a revoked token
    // answers `{ error }`. Both used to flatten to `[]`, which reads as "we
    // looked and there is nothing there".
    if (!Array.isArray(result?.data)) {
      if (result?.error)
        console.error("[naystack] Instagram media:", result.error.message);
      return null;
    }
    return result.data.map(toPost);
  },
};
