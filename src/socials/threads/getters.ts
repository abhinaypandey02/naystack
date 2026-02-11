import { ThreadsPost } from "@/src/socials/threads/types";

import { getThreadsData } from "./utils";

/**
 * Fetches a single Threads post by id.
 * @param token - Access token
 * @param id - Post id
 * @param fields - Optional field list
 * @returns Promise of post data
 */
export const getThread = <T = ThreadsPost>(
  token: string,
  id: string,
  fields?: string[],
) => {
  return getThreadsData<T>(token, id, {
    fields: fields ? fields.join(",") : "text,permalink,username",
  });
};

/**
 * Fetches current user's Threads posts.
 * @param token - Access token
 * @param fields - Optional field list
 * @returns Promise of posts array
 */
export const getThreads = <T = ThreadsPost>(
  token: string,
  fields?: string[],
) => {
  return getThreadsData<{ data: T[] }>(token, "me/threads", {
    fields: fields ? fields.join(",") : "text,permalink,username",
  }).then((res) => res?.data);
};

/**
 * Fetches replies to a Threads post.
 * @param token - Access token
 * @param id - Post id
 * @param fields - Optional field list
 * @returns Promise of replies array
 */
export const getThreadsReplies = <T = ThreadsPost>(
  token: string,
  id: string,
  fields?: string[],
) => {
  return getThreadsData<{ data: T[] }>(token, `${id}/replies`, {
    fields: fields ? fields.join(",") : "text,username,permalink",
  }).then((res) => res?.data);
};
