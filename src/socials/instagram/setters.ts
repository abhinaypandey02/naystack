import { getInstagramData } from "./utils";

/**
 * Sends a text message to an Instagram user via the Messaging API.
 * @param token - Access token
 * @param to - Recipient Instagram id
 * @param text - Message text
 * @returns Promise of API response (recipient_id, message_id)
 */
export const sendInstagramMessage = (
  token: string,
  to: string,
  text: string,
) => {
  return getInstagramData<{
    recipient_id?: string;
    message_id?: string;
  }>(token, "me/messages", undefined, {
    recipient: { id: to },
    message: {
      text,
    },
  });
};
