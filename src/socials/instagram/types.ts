import { WaitForContainerOptions } from "@/src/socials/meta/container";

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
 * One image or video to publish. The URL must be publicly reachable — Instagram
 * downloads it server-side.
 *
 * @property url - Public URL. Images must be **JPEG**.
 * @property type - `"image"` or `"video"`.
 * @property altText - Accessibility description, up to 1000 characters. Images only.
 *
 * @category Socials
 */
export type InstagramPostMedia = {
  url: string;
  type: "image" | "video";
  altText?: string;
};

/**
 * Input for {@link createInstagramPost}. What gets published follows from `media`:
 *
 * | `media` | Result |
 * | --- | --- |
 * | one image | feed image |
 * | one video | reel |
 * | 2–10 items | carousel (counts as one post) |
 * | any, with `story: true` | story, from the first item |
 *
 * @property media - One item or an array. Images are cropped to the first item's aspect ratio in a carousel.
 * @property caption - Post caption.
 * @property story - Publish as a 24-hour story instead of to the feed. Uses the first media item only.
 * @property locationID - Facebook Page id to tag as the location. Single images only.
 * @property coverURL - Reels: public URL of a cover image. Takes precedence over `thumbOffset`.
 * @property thumbOffset - Reels: frame to use as the thumbnail, in milliseconds.
 * @property shareToFeed - Reels: also show the reel in the feed, not only the Reels tab.
 * @property audioName - Reels: name for the audio track. Can only be set once.
 * @property collaborators - Reels: up to 3 public usernames to invite as collaborators.
 * @property wait - Container polling settings.
 *
 * @category Socials
 */
export type InstagramPostInput = {
  media: InstagramPostMedia | InstagramPostMedia[];
  caption?: string;
  story?: boolean;
  locationID?: string;
  coverURL?: string;
  thumbOffset?: number;
  shareToFeed?: boolean;
  audioName?: string;
  collaborators?: string[];
  wait?: WaitForContainerOptions;
};
