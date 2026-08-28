import { ContainerState, ContainerStatus } from "@/src/socials/meta/types";
import { ThreadsPost } from "@/src/socials/threads/types";

import { getThreadsData } from "./utils";

/**
 * Fetches a single Threads post by id.
 *
 * @param token - Threads access token.
 * @param id - Post id.
 * @param fields - Optional array of field names. Default: `["text", "permalink", "username"]`.
 * @returns Promise of post data (typed as `T`, defaults to {@link ThreadsPost}).
 *
 * @example
 * ```ts
 * import { getThread } from "naystack/socials";
 *
 * const post = await getThread(accessToken, postId);
 * console.log(post?.text, post?.permalink);
 * ```
 *
 * @category Socials
 */
export const getThread = <T = ThreadsPost>(
  token: string,
  id: string,
  fields?: string[],
) => {
  return getThreadsData<T>(token, id, {
    params: { fields: fields ? fields.join(",") : "text,permalink,username" },
  });
};

/**
 * Fetches the authenticated user's Threads posts.
 *
 * @param token - Threads access token.
 * @param fields - Optional array of field names. Default: `["text", "permalink", "username"]`.
 * @returns Promise of an array of posts (typed as `T[]`, defaults to {@link ThreadsPost}`[]`).
 *
 * @example
 * ```ts
 * import { getThreads } from "naystack/socials";
 *
 * const threads = await getThreads(accessToken);
 * for (const thread of threads ?? []) {
 *   console.log(thread.text, thread.permalink);
 * }
 * ```
 *
 * @category Socials
 */
export const getThreads = <T = ThreadsPost>(
  token: string,
  fields?: string[],
) => {
  return getThreadsData<{ data: T[] }>(token, "me/threads", {
    params: { fields: fields ? fields.join(",") : "text,permalink,username" },
  }).then((res) => res?.data);
};

/**
 * Fetches replies to a Threads post.
 *
 * @param token - Threads access token.
 * @param id - Parent post id.
 * @param fields - Optional array of field names. Default: `["text", "username", "permalink"]`.
 * @returns Promise of an array of reply posts.
 *
 * @example
 * ```ts
 * import { getThreadsReplies } from "naystack/socials";
 *
 * const replies = await getThreadsReplies(accessToken, postId);
 * for (const reply of replies ?? []) {
 *   console.log(reply.username, ":", reply.text);
 * }
 * ```
 *
 * @category Socials
 */
export const getThreadsReplies = <T = ThreadsPost>(
  token: string,
  id: string,
  fields?: string[],
) => {
  return getThreadsData<{ data: T[] }>(token, `${id}/replies`, {
    params: { fields: fields ? fields.join(",") : "text,username,permalink" },
  }).then((res) => res?.data);
};

/**
 * Reads a media container's processing status. Image, video and carousel
 * containers must reach `FINISHED` before they can be published.
 *
 * @param token - Threads access token.
 * @param id - Container id from `createThreadsContainer`.
 * @returns Promise of `{ status, error? }`, or `null` if the status was unreadable.
 *
 * @example
 * ```ts
 * import { getThreadsContainerStatus } from "naystack/socials";
 *
 * const state = await getThreadsContainerStatus(accessToken, containerId);
 * if (state?.status === "FINISHED") await publishThreadsContainer(accessToken, containerId);
 * ```
 *
 * @category Socials
 */
export const getThreadsContainerStatus = async (
  token: string,
  id: string,
): Promise<ContainerState | null> => {
  const result = await getThreadsData<{
    status?: ContainerStatus;
    error_message?: string;
  }>(token, id, { params: { fields: "status,error_message" } });
  if (!result?.status) return null;
  return { status: result.status, error: result.error_message };
};
