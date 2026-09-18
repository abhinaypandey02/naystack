import type { youtube_v3 } from "googleapis/build/src/apis/youtube";

import { SocialProvider } from "@/src/socials/provider";
import {
  SocialMediaKind,
  SocialPlatform,
  SocialPost,
  socialProfileURL,
} from "@/src/socials/types";

import {
  exchangeYouTubeCode,
  getYouTubeAuthorizationURL,
  refreshYouTubeToken,
  YouTubeScope,
} from "./auth";
import {
  describeYouTubeError,
  getYouTubeChannel,
  getYouTubeUploads,
  isYouTubeAuthError,
} from "./getters";

// Statistics come back as strings; an absent one means the platform hid it.
const count = (value?: string | null) => (value == null ? null : Number(value));

type Video = youtube_v3.Schema$Video & {
  id: string;
  snippet: youtube_v3.Schema$VideoSnippet & { publishedAt: string };
};

function toPost(video: Video): SocialPost {
  const thumbnails = video.snippet.thumbnails;
  return {
    platform: SocialPlatform.Youtube,
    platformMediaId: video.id,
    permalink: `https://www.youtube.com/watch?v=${video.id}`,
    thumbnail:
      thumbnails?.maxres?.url ??
      thumbnails?.standard?.url ??
      thumbnails?.high?.url ??
      thumbnails?.medium?.url ??
      thumbnails?.default?.url ??
      null,
    mediaURL: null,
    caption: video.snippet.title ?? null,
    // A Short is a video, not a kind of its own.
    kind: SocialMediaKind.Video,
    publishedAt: video.snippet.publishedAt,
    likes: count(video.statistics?.likeCount),
    comments: count(video.statistics?.commentCount),
    views: count(video.statistics?.viewCount),
    // Needs the YouTube Analytics API — different scope and quota.
    shares: null,
    metadata: { description: video.snippet.description ?? null },
  };
}

/**
 * YouTube as a normalized {@link SocialProvider}.
 *
 * A ready-made singleton — import and call it, there is nothing to construct.
 * Credentials are read from the environment inside the `auth` methods, so
 * `fetchProfile` and `fetchMedia` need only a token.
 *
 * Wraps the platform-specific helpers rather than replacing them:
 * {@link getYouTubeChannel} and {@link getYouTubeUploads} remain the way to
 * reach fields this normalization drops.
 *
 * `followers` is `null` when the channel hides its subscriber count.
 *
 * Requires env vars for `auth` only: `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`
 * — or `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, which they fall back to.
 *
 * @example
 * ```ts
 * import { YouTubeProvider } from "naystack/socials";
 *
 * const profile = await YouTubeProvider.fetchProfile(accessToken);
 * const posts = await YouTubeProvider.fetchMedia?.(accessToken, { limit: 50 });
 * ```
 *
 * @category Socials
 */
export const YouTubeProvider: SocialProvider = {
  platform: SocialPlatform.Youtube,

  auth: {
    authorizationURL: ({ state, redirectURI, scopes }) =>
      getYouTubeAuthorizationURL(
        state,
        redirectURI,
        scopes as YouTubeScope[] | undefined,
      ),

    exchangeCode: async ({ code, redirectURI }) => {
      try {
        const result = await exchangeYouTubeCode(code, redirectURI);
        if (!result) {
          console.error("[naystack] YouTube code exchange returned no token");
          return null;
        }
        // Google's token response carries no channel id; the route takes it
        // from `fetchProfile`.
        return { ...result, platformUserId: null };
      } catch (error) {
        console.error(
          "[naystack] YouTube code exchange:",
          describeYouTubeError(error),
        );
        return null;
      }
    },

    // Without a refresh token the grant can never be renewed — the same
    // outcome as a revoked one, so it reports the same way.
    refresh: ({ refreshToken }) =>
      refreshToken ? refreshYouTubeToken(refreshToken) : Promise.resolve(null),
  },

  profileURL: (username) => socialProfileURL(SocialPlatform.Youtube, username),

  fetchProfile: async (accessToken) => {
    // `null` is "this token can't read a profile" — a caller may count it
    // against the account. An outage or quota error is not that, so it throws.
    const channel = await getYouTubeChannel(accessToken).catch(
      (error: unknown) => {
        if (!isYouTubeAuthError(error)) throw error;
        console.error(
          "[naystack] YouTube channel:",
          describeYouTubeError(error),
        );
        return null;
      },
    );
    // Also `null` for a Google account that has no channel at all.
    if (!channel?.id) return null;
    return {
      platform: SocialPlatform.Youtube,
      platformUserId: channel.id,
      // `customUrl` is `@handle`; some channels still have none, and the
      // channel id is the one identifier every channel has.
      username: channel.snippet?.customUrl?.replace(/^@/, "") || channel.id,
      displayName: channel.snippet?.title ?? null,
      avatar: channel.snippet?.thumbnails?.high?.url ?? null,
      // A hidden count still comes back as a number; the flag is what says
      // it isn't one we may show or gate on.
      followers: channel.statistics?.hiddenSubscriberCount
        ? null
        : count(channel.statistics?.subscriberCount),
      contentCount: count(channel.statistics?.videoCount) ?? 0,
      metadata: {
        viewCount: count(channel.statistics?.viewCount),
        hiddenSubscriberCount:
          channel.statistics?.hiddenSubscriberCount ?? false,
        country: channel.snippet?.country ?? null,
        uploadsPlaylistId:
          channel.contentDetails?.relatedPlaylists?.uploads ?? null,
      },
    };
  },

  fetchMedia: async (accessToken, options) => {
    try {
      const channel = await getYouTubeChannel(accessToken);
      const uploads = channel?.contentDetails?.relatedPlaylists?.uploads;
      if (!uploads) return [];
      const videos = await getYouTubeUploads(
        accessToken,
        uploads,
        options?.limit ?? 50,
      );
      // The owner's playlist includes private and unlisted uploads;
      // `videos.list` returns in arbitrary order, not the id order.
      return videos
        .filter(
          (video): video is Video =>
            Boolean(video.id && video.snippet?.publishedAt) &&
            video.status?.privacyStatus === "public",
        )
        .map(toPost)
        .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    } catch (error) {
      console.error("[naystack] YouTube media:", describeYouTubeError(error));
      return null;
    }
  },
};
