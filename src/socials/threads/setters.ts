import { getThreadsData } from "./utils";

/**
 * Creates a Threads container (draft post). Must be published with `publishContainer`.
 * This is a low-level function — prefer using {@link createThreadsPost} which handles both steps.
 *
 * @param token - Threads access token.
 * @param text - Post text.
 * @param reply_to_id - Optional parent post id (for replies).
 * @returns Promise of the container creation id.
 * @category Socials
 */
export function createContainer(
  token: string,
  text: string,
  reply_to_id?: string,
) {
  return getThreadsData<{ id: string }>(
    token,
    "me/threads",
    {
      media_type: "TEXT",
      text,
      ...(reply_to_id ? { reply_to_id } : {}),
    },
    "POST",
  ).then((res) => res?.id);
}

/**
 * Publishes a Threads container (created with `createContainer`).
 * This is a low-level function — prefer using {@link createThreadsPost} which handles both steps.
 *
 * @param token - Threads access token.
 * @param creation_id - Container id from `createContainer`.
 * @returns Promise of the published post id.
 * @category Socials
 */
export function publishContainer(token: string, creation_id: string) {
  return getThreadsData<{ id: string }>(
    token,
    "me/threads_publish",
    {
      creation_id,
    },
    "POST",
  ).then((res) => res?.id);
}

/**
 * Creates and publishes a single Threads post. Handles the two-step container + publish flow
 * with an automatic 2-second delay between creation and publishing (required by the Threads API).
 *
 * @param token - Threads access token.
 * @param text - Post text.
 * @param reply_to_id - Optional parent post id (to make this post a reply).
 * @returns Promise of the published post id, or `null` if creation failed.
 *
 * @example
 * ```ts
 * import { createThreadsPost } from "naystack/socials";
 *
 * const postId = await createThreadsPost(accessToken, "Hello from Naystack!");
 * console.log("Published:", postId);
 * ```
 *
 * @category Socials
 */
export const createThreadsPost = async (
  token: string,
  text: string,
  reply_to_id?: string,
) => {
  const containerID = await createContainer(token, text, reply_to_id);
  if (!containerID) return null;
  await new Promise((resolve) => setTimeout(resolve, 2000));
  return publishContainer(token, containerID);
};

/**
 * Creates a thread — a sequence of posts where each replies to the previous one.
 * Newlines in post text are converted to `%0A` for the API.
 *
 * @param token - Threads access token.
 * @param threads - Array of post text strings (in order). Each post after the first becomes a reply to the previous.
 * @returns Promise of the first published post's id.
 *
 * @example
 * ```ts
 * import { createThread } from "naystack/socials";
 *
 * const firstPostId = await createThread(accessToken, [
 *   "First post in thread",
 *   "Second post (reply to first)",
 *   "Third post (reply to second)",
 * ]);
 * ```
 *
 * @category Socials
 */
export const createThread = async (token: string, threads: string[]) => {
  const publishedIDs: string[] = [];
  for (const thread of threads) {
    const postID = await createThreadsPost(
      token,
      thread.split("\n").join("%0A"),
      publishedIDs.at(-1),
    );
    if (postID) publishedIDs.push(postID);
  }
  return publishedIDs[0];
};
