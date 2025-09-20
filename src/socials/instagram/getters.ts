import {
  InstagramConversation,
  InstagramMedia,
  InstagramMessage,
  InstagramUser,
} from "@/src/socials/instagram/types";

import { getInstagramData } from "./utils";

export const getInstagramUser = <T = InstagramUser>(
  token: string,
  id?: string,
  fields?: string[],
) => {
  return getInstagramData<T>(token, id || "me", {
    fields: fields ? fields.join(",") : "username,followers_count,media_count",
  });
};

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
export const getInstagramConversationByUser = async (
  token: string,
  userID: string,
) => {
  const res = await getInstagramConversationsByUser(token, userID);
  return res?.data?.find((item) => item.participants?.data.length === 2);
};

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

export const getInstagramMessage = <T = InstagramMessage>(
  token: string,
  id: string,
  fields?: string[],
) => {
  return getInstagramData<T>(token, id, {
    fields: fields ? fields.join(",") : "id,created_time,from,to,message",
  });
};
