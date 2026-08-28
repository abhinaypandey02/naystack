import { createPublisher } from "@/src/socials/meta/container";
import { readGraphID } from "@/src/socials/meta/request";
import { GraphParams, MetaMediaType } from "@/src/socials/meta/types";
import { getThreadsContainerStatus } from "@/src/socials/threads/getters";
import {
  ThreadsPostInput,
  ThreadsPostMedia,
} from "@/src/socials/threads/types";

import { getThreadsData } from "./utils";

const publisher = createPublisher({
  name: "Threads",
  getStatus: getThreadsContainerStatus,
  createContainer: async (token, params) =>
    readGraphID(
      "Threads container",
      await getThreadsData<{ id: string }>(token, "me/threads", {
        params,
        method: "POST",
      }),
    ),
  publish: async (token, creationID) =>
    readGraphID(
      "Threads publish",
      await getThreadsData<{ id: string }>(token, "me/threads_publish", {
        params: { creation_id: creationID },
        method: "POST",
      }),
    ),
});

const mediaParams = (media?: ThreadsPostMedia): GraphParams => ({
  media_type: media
    ? media.type === MetaMediaType.Video
      ? "VIDEO"
      : "IMAGE"
    : "TEXT",
  image_url: media?.type === MetaMediaType.Photo ? media.url : undefined,
  video_url: media?.type === MetaMediaType.Video ? media.url : undefined,
  alt_text: media?.altText,
});

/**
 * Publishes to Threads — text, image, video or carousel, chosen from the media you
 * pass. Creates the container, waits for Threads to finish processing it, then publishes.
 *
 * Media URLs must be publicly reachable — Threads downloads them server-side.
 *
 * @param token - Threads access token.
 * @param input - Post text, or a {@link ThreadsPostInput} for media, replies and reply controls.
 * @param replyToID - Parent post id, to make this post a reply. Also settable on `input`.
 * @returns Promise of the published post id, or `null` if any step failed (the API's error is logged).
 *
 * @example
 * ```ts
 * import { createThreadsPost } from "naystack/socials";
 *
 * await createThreadsPost(accessToken, "Hello from Naystack!");
 *
 * await createThreadsPost(accessToken, {
 *   text: "Campaign recap",
 *   media: [
 *     { url: "https://cdn.example.com/1.jpg", type: "image" },
 *     { url: "https://cdn.example.com/2.mp4", type: "video" },
 *   ],
 * });
 * ```
 *
 * @category Socials
 */
export const createThreadsPost = async (
  token: string,
  input: string | ThreadsPostInput,
  replyToID?: string,
) => {
  const post = typeof input === "string" ? { text: input } : input;
  const media = post.media ? [post.media].flat() : [];
  const shared: GraphParams = {
    text: post.text,
    reply_to_id: post.replyToID || replyToID,
    reply_control: post.replyControl,
  };

  if (media.length > 1) {
    const children = await publisher.createChildren(
      token,
      media.map((item) => mediaParams(item)),
      post.wait,
    );
    if (!children) return null;
    return publisher.publish(
      token,
      { ...shared, media_type: "CAROUSEL", children: children.join(",") },
      post.wait,
    );
  }

  return publisher.publish(
    token,
    {
      ...mediaParams(media[0]),
      ...shared,
      link_attachment: post.linkAttachment,
    },
    post.wait,
  );
};

/**
 * Publishes a thread — a sequence of posts where each replies to the previous one.
 *
 * @param token - Threads access token.
 * @param posts - Posts in order, as text or {@link ThreadsPostInput}.
 * @returns Promise of the first published post's id.
 *
 * @example
 * ```ts
 * import { createThread } from "naystack/socials";
 *
 * const firstPostId = await createThread(accessToken, [
 *   "First post in thread",
 *   "Second post (reply to first)",
 *   { text: "Third, with a picture", media: { url: "https://cdn.example.com/3.jpg", type: "image" } },
 * ]);
 * ```
 *
 * @category Socials
 */
export const createThread = async (
  token: string,
  posts: (string | ThreadsPostInput)[],
) => {
  const publishedIDs: string[] = [];
  for (const post of posts) {
    const postID = await createThreadsPost(token, post, publishedIDs.at(-1));
    if (postID) publishedIDs.push(postID);
  }
  return publishedIDs[0];
};
