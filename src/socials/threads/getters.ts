import { ThreadsPost } from "@/src/socials/threads/types";

import { getThreadsData } from "./utils";

export const getThread = <T = ThreadsPost>(
  token: string,
  id: string,
  fields?: string[],
) => {
  return getThreadsData<T>(token, id, {
    fields: fields ? fields.join(",") : "text,permalink,username",
  });
};

export const getThreads = <T = ThreadsPost>(
  token: string,
  fields?: string[],
) => {
  return getThreadsData<{ data: T[] }>(token, "me/threads", {
    fields: fields ? fields.join(",") : "text,permalink,username",
  }).then((res) => res?.data);
};

export const getThreadsReplies = <T = ThreadsPost>(
  token: string,
  id: string,
  fields?: string[],
) => {
  return getThreadsData<{ data: T[] }>(token, `${id}/replies`, {
    fields: fields ? fields.join(",") : "text,username,permalink",
  }).then((res) => res?.data);
};
