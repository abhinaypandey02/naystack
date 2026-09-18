// Deep import, not `from "googleapis"`: the root barrel loads all 317 API
// clients (536ms / 170MB at require time) for the one used here.
import {
  auth,
  youtube,
  type youtube_v3,
} from "googleapis/build/src/apis/youtube";

// No client id/secret: a bearer token is all a read needs, so these work in a
// process with no YouTube OAuth configuration at all.
const client = (accessToken: string) => {
  const oauth = new auth.OAuth2();
  oauth.setCredentials({ access_token: accessToken });
  return youtube({ version: "v3", auth: oauth });
};

/**
 * The authorized user's own channel, with `snippet`, `statistics` and
 * `contentDetails`. One quota unit.
 *
 * @returns The channel, or `null` when the Google account has none.
 *
 * @category Socials
 */
export async function getYouTubeChannel(
  accessToken: string,
): Promise<youtube_v3.Schema$Channel | null> {
  try {
    const { data } = await client(accessToken).channels.list({
      part: ["snippet", "statistics", "contentDetails"],
      mine: true,
    });
    return data.items?.[0] ?? null;
  } catch (error) {
    // `mine=true` answers 401 rather than an empty list for an account with no channel.
    if (youtubeErrorReasons(error).includes("youtubeSignupRequired"))
      return null;
    throw error;
  }
}

type YouTubeAPIError = {
  message?: string;
  status?: number;
  response?: {
    status?: number;
    data?: { error?: { message?: string; errors?: { reason?: string }[] } };
  };
};

const asAPIError = (error: unknown) => (error ?? {}) as YouTubeAPIError;

const youtubeErrorReasons = (error: unknown) =>
  asAPIError(error).response?.data?.error?.errors?.map((e) => e.reason ?? "") ??
  [];

/** The token itself was refused — invalid, expired, or lacking the scope. */
export const isYouTubeAuthError = (error: unknown) => {
  const e = asAPIError(error);
  return (e.response?.status ?? e.status) === 401;
};

/** `message (reason, reason)` — what a log line needs from a GaxiosError. */
export const describeYouTubeError = (error: unknown) => {
  const reasons = youtubeErrorReasons(error).filter(Boolean);
  const e = asAPIError(error);
  const message =
    e.response?.data?.error?.message ?? e.message ?? String(error);
  return reasons.length ? `${message} (${reasons.join(", ")})` : message;
};

/**
 * The most recent videos in a channel's uploads playlist, with `snippet`,
 * `statistics` and `status`. Two quota units: one page of the playlist, then
 * one `videos.list` over its ids.
 *
 * Returns whatever the playlist holds — when authorized as the owner that
 * includes private and unlisted videos, so filter on `status.privacyStatus`
 * before showing anything publicly. Videos deleted since being added to the
 * playlist are absent from the result.
 *
 * @param uploadsPlaylistId - `contentDetails.relatedPlaylists.uploads` from {@link getYouTubeChannel}.
 * @param limit - At most 50, the API's page size.
 *
 * @category Socials
 */
export async function getYouTubeUploads(
  accessToken: string,
  uploadsPlaylistId: string,
  limit = 50,
): Promise<youtube_v3.Schema$Video[]> {
  const yt = client(accessToken);
  const { data: playlist } = await yt.playlistItems.list({
    part: ["contentDetails"],
    playlistId: uploadsPlaylistId,
    maxResults: Math.min(limit, 50),
  });
  const ids = (playlist.items ?? [])
    .map((item) => item.contentDetails?.videoId)
    .filter((id): id is string => Boolean(id));
  if (!ids.length) return [];

  const { data: videos } = await yt.videos.list({
    part: ["snippet", "statistics", "status"],
    id: ids,
  });
  return videos.items ?? [];
}
