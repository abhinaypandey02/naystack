import { getInstagramData } from "./utils";

/**
 * Sends a text message to an Instagram user via the Instagram Messaging API.
 *
 * @param token - Instagram access token.
 * @param to - Recipient's Instagram user id.
 * @param text - Message text to send.
 * @returns Promise of `{ recipient_id, message_id }` on success.
 *
 * @example
 * ```ts
 * import { sendInstagramMessage } from "naystack/socials";
 *
 * const result = await sendInstagramMessage(accessToken, recipientId, "Hello!");
 * console.log("Sent message:", result?.message_id);
 * ```
 *
 * @category Socials
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
