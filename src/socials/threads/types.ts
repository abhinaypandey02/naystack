import { WaitForContainerOptions } from "@/src/socials/meta/container";

/**
 * Threads post (single post or reply).
 *
 * @property text - Post text content.
 * @property permalink - Permanent URL to the post on Threads.
 * @property username - Author's username.
 *
 * @category Socials
 */
export type ThreadsPost = {
  text: string;
  permalink: string;
  username: string;
};

/**
 * One image or video to publish. The URL must be publicly reachable — Threads
 * downloads it server-side.
 *
 * @property url - Public URL. Images: JPEG/PNG, 8 MB max. Videos: MP4/MOV, 1 GB / 5 min max.
 * @property type - `"image"` or `"video"`.
 * @property altText - Accessibility description.
 *
 * @category Socials
 */
export type ThreadsPostMedia = {
  url: string;
  type: "image" | "video";
  altText?: string;
};

/**
 * Input for {@link createThreadsPost}. What gets published follows from `media`:
 * none is a text post, one is a single image or video, 2–20 is a carousel.
 *
 * @property text - Post text, 500 characters max.
 * @property media - One item or an array.
 * @property linkAttachment - URL to render as a preview card. Text-only posts.
 * @property replyToID - Parent post id, to make this post a reply.
 * @property replyControl - Who may reply.
 * @property wait - Container polling settings.
 *
 * @category Socials
 */
export type ThreadsPostInput = {
  text?: string;
  media?: ThreadsPostMedia | ThreadsPostMedia[];
  linkAttachment?: string;
  replyToID?: string;
  replyControl?: "everyone" | "accounts_you_follow" | "mentioned_only";
  wait?: WaitForContainerOptions;
};
