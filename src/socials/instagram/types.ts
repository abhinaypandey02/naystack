/**
 * Instagram Messaging API message shape.
 *
 * @property id - Message id.
 * @property created_time - ISO timestamp of when the message was sent.
 * @property from - Sender's id and username.
 * @property to - Array of recipient ids and usernames.
 * @property message - Text content of the message.
 *
 * @category Socials
 */
export type InstagramMessage = {
  id: string;
  created_time: string;
  from: { id: string; username: string };
  to: {
    data: {
      username: string;
      id: string;
    }[];
  };
  message: string;
};

/**
 * Instagram user/profile data (e.g. from the `"me"` endpoint).
 *
 * @property username - Instagram handle.
 * @property followers_count - Number of followers.
 * @property media_count - Number of media posts.
 *
 * @category Socials
 */
export type InstagramUser = {
  username: string;
  followers_count: number;
  media_count: number;
};

/**
 * Instagram media item (e.g. from the `me/media` endpoint).
 *
 * @property like_count - Number of likes (may be undefined if not requested).
 * @property comments_count - Number of comments.
 * @property permalink - Permanent URL to the post on Instagram.
 *
 * @category Socials
 */
export type InstagramMedia = {
  like_count?: number;
  comments_count: number;
  permalink: string;
};

/**
 * Instagram conversation (DM thread) from the Messaging API.
 *
 * @property id - Conversation id.
 * @property updated_time - ISO timestamp of the last update.
 * @property messages - Optional nested messages with pagination cursors.
 * @property participants - Optional array of participant ids and usernames.
 *
 * @category Socials
 */
export type InstagramConversation = {
  id: string;
  updated_time: string;
  messages?: {
    data: { id: string; created_time: string }[];
    paging: { cursors?: { after?: string } };
  };
  participants?: {
    data: { id: string; username: string }[];
  };
};

/**
 * Instagram Graph API error response shape.
 *
 * @property error - Error details from the API (message, type, code, subcode, trace id).
 *
 * @category Socials
 */
export type InstagramError = {
  error?: {
    message: string;
    type: string;
    code: number;
    error_subcode: number;
    fbtrace_id: string;
  };
};
