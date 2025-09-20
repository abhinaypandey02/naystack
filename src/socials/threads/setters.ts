import { getThreadsData } from "./utils";

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
