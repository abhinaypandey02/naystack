import {
  InstagramConversation,
  InstagramMedia,
  InstagramMessage,
  InstagramUser,
} from "@/src/socials/instagram/types";

import { getInstagramData } from "./utils";

/**
 * Fetches Instagram user (default "me") with optional fields.
 * @param token - Access token
 * @param id - User id (default "me")
 * @param fields - Optional field list
 * @returns Promise of user data
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
 * Fetches current user's media list.
 * @param token - Access token
 * @param fields - Optional field list
 * @param limit - Max items (default 12)
 * @returns Promise of media list response
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
 * Fetches Instagram conversations with pagination (fetchMore).
 * @param token - Access token
 * @param limit - Page size (default 25)
 * @param cursor - Optional after cursor
 * @returns Promise of { data, fetchMore? }
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
 * Fetches conversations filtered by user id.
 * @param token - Access token
 * @param userID - Instagram user id
 * @returns Promise of conversations response
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
 * Fetches the single conversation between the current user and the given user.
 * @param token - Access token
 * @param userID - Other participant's id
 * @returns Promise of conversation or undefined
 */
export const getInstagramConversationByUser = async (
  token: string,
  userID: string,
) => {
  const res = await getInstagramConversationsByUser(token, userID);
  return res?.data?.find((item) => item.participants?.data.length === 2);
};

/**
 * Fetches a single conversation by id with messages and participants.
 * @param token - Access token
 * @param id - Conversation id
 * @param cursor - Optional pagination cursor
 * @returns Promise of { messages, participants, fetchMore? }
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
 * @param token - Access token
 * @param id - Message id
 * @param fields - Optional field list
 * @returns Promise of message data
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
