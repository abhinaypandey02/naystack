import {
  InstagramConversation,
  InstagramMedia,
  InstagramMessage,
  InstagramUser,
} from "@/src/socials/instagram/types";

import { getInstagramData } from "./utils";

/**
 * Fetches an Instagram user's profile. Defaults to the authenticated user (`"me"`).
 *
 * @param token - Instagram access token.
 * @param id - User id to fetch. Defaults to `"me"` (the token owner).
 * @param fields - Optional array of field names to request. Default: `["username", "followers_count", "media_count"]`.
 * @returns Promise of user data (typed as `T`, defaults to {@link InstagramUser}).
 *
 * @example
 * ```ts
 * import { getInstagramUser } from "naystack/socials";
 *
 * const user = await getInstagramUser(accessToken);
 * console.log(user?.username, user?.followers_count);
 * ```
 *
 * @category Socials
 */
export const getInstagramUser = <T = InstagramUser>(
  token: string,
  id?: string,
  fields?: string[],
) => {
  return getInstagramData<T>(token, id || "me", {
    fields: fields ? fields.join(",") : "username,followers_count,media_count",
  });
};

/**
 * Fetches the authenticated user's recent Instagram media.
 *
 * @param token - Instagram access token.
 * @param fields - Optional array of field names. Default: `["like_count", "comments_count", "permalink"]`.
 * @param limit - Maximum number of items to return. Default: `12`.
 * @returns Promise of `{ data: T[] }` where T defaults to {@link InstagramMedia}.
 *
 * @example
 * ```ts
 * import { getInstagramMedia } from "naystack/socials";
 *
 * const media = await getInstagramMedia(accessToken, undefined, 10);
 * for (const item of media?.data ?? []) {
 *   console.log(item.permalink, item.like_count);
 * }
 * ```
 *
 * @category Socials
 */
export const getInstagramMedia = <T = InstagramMedia>(
  token: string,
  fields?: string[],
  limit: number = 12,
) => {
  return getInstagramData<{ data: T[] }>(token, "me/media", {
    fields: fields ? fields.join(",") : "like_count,comments_count,permalink",
    limit: limit?.toString(),
  });
};

/**
 * Fetches Instagram conversations (DM threads) with pagination support.
 *
 * @param token - Instagram access token.
 * @param limit - Page size. Default: `25`.
 * @param cursor - Optional pagination cursor (from a previous `fetchMore`).
 * @returns Promise of `{ data: InstagramConversation[], fetchMore?: () => Promise<...> }`.
 *   Call `fetchMore()` to load the next page.
 *
 * @example
 * ```ts
 * import { getInstagramConversations } from "naystack/socials";
 *
 * const convos = await getInstagramConversations(accessToken, 25);
 * for (const convo of convos.data ?? []) {
 *   console.log(convo.participants, convo.messages);
 * }
 * if (convos.fetchMore) {
 *   const nextPage = await convos.fetchMore();
 * }
 * ```
 *
 * @category Socials
 */
export const getInstagramConversations = async (
  token: string,
  limit: number = 25,
  cursor?: string,
) => {
  const result = await getInstagramData<{
    data: InstagramConversation[];
    paging: { cursors?: { after?: string } };
  }>(token, "me/conversations", {
    platform: "instagram",
    fields: "participants,messages,updated_time",
    limit: limit.toString(),
    ...(cursor ? { after: cursor } : {}),
  });
  return {
    data: result?.data.map((item) => ({
      ...item,
      messages: item.messages?.data,
      participants: item.participants?.data,
    })),
    fetchMore: result?.paging?.cursors?.after
      ? () =>
          getInstagramConversations(token, limit, result.paging.cursors?.after)
      : undefined,
  };
};

/**
 * Fetches conversations filtered by a specific Instagram user id.
 *
 * @param token - Instagram access token.
 * @param userID - The Instagram user id to filter conversations by.
 * @returns Promise of `{ data: InstagramConversation[] }`.
 *
 * @category Socials
 */
export const getInstagramConversationsByUser = (
  token: string,
  userID: string,
) => {
  return getInstagramData<{ data: InstagramConversation[] }>(
    token,
    "me/conversations",
    {
      fields: "participants,messages,updated_time",
      user_id: userID,
    },
  );
};

/**
 * Fetches the single conversation between the authenticated user and the given user.
 * Filters for conversations with exactly 2 participants.
 *
 * @param token - Instagram access token.
 * @param userID - The other participant's Instagram user id.
 * @returns Promise of a single `InstagramConversation` or `undefined` if not found.
 *
 * @category Socials
 */
export const getInstagramConversationByUser = async (
  token: string,
  userID: string,
) => {
  const res = await getInstagramConversationsByUser(token, userID);
  return res?.data?.find((item) => item.participants?.data.length === 2);
};

/**
 * Fetches a single Instagram conversation by id with messages and participants.
 * Supports pagination for messages via `fetchMore`.
 *
 * @param token - Instagram access token.
 * @param id - Conversation id.
 * @param cursor - Optional pagination cursor for messages.
 * @returns Promise of `{ messages, participants, fetchMore? }`.
 *
 * @example
 * ```ts
 * import { getInstagramConversation } from "naystack/socials";
 *
 * const convo = await getInstagramConversation(accessToken, conversationId);
 * for (const msg of convo.messages ?? []) {
 *   console.log(msg.id, msg.created_time);
 * }
 * if (convo.fetchMore) {
 *   const older = await convo.fetchMore();
 * }
 * ```
 *
 * @category Socials
 */
export const getInstagramConversation = async (
  token: string,
  id: string,
  cursor?: string,
) => {
  const result = await getInstagramData<InstagramConversation>(token, id + "", {
    fields: "participants,messages,updated_time",
    ...(cursor ? { after: cursor } : {}),
  });
  return {
    messages: result?.messages?.data,
    participants: result?.participants?.data,
    fetchMore: result?.messages?.paging.cursors?.after
      ? () =>
          getInstagramConversation(
            token,
            id,
            result?.messages?.paging?.cursors?.after,
          )
      : undefined,
  };
};

/**
 * Fetches a single Instagram message by id.
 *
 * @param token - Instagram access token.
 * @param id - Message id.
 * @param fields - Optional array of field names. Default: `["id", "created_time", "from", "to", "message"]`.
 * @returns Promise of message data (typed as `T`, defaults to {@link InstagramMessage}).
 *
 * @category Socials
 */
export const getInstagramMessage = <T = InstagramMessage>(
  token: string,
  id: string,
  fields?: string[],
) => {
  return getInstagramData<T>(token, id, {
    fields: fields ? fields.join(",") : "id,created_time,from,to,message",
  });
};
