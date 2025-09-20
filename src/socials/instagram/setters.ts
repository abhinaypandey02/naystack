import { getInstagramData } from "./utils";

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
