/**
 * Socials module: publish to and read from Instagram and Threads.
 *
 * Each platform exposes one publishing method — {@link createInstagramPost},
 * {@link createThreadsPost} — that picks the right media type from what you pass.
 * The container/publish steps underneath are an implementation detail.
 *
 * Layout: `socials/meta/` is the Graph protocol Instagram and Threads share;
 * each platform gets its own folder. A platform on a different API brings its own
 * client and exposes its own `create<Platform>Post`.
 *
 * @example
 * ```ts
 * import { createInstagramPost } from "naystack/socials";
 *
 * await createInstagramPost(token, {
 *   caption: "New campaign is live 🎉",
 *   media: { url: "https://cdn.example.com/promo.mp4", type: "video" },
 * });
 * ```
 *
 * @module
 */
export {
  canPublishToInstagram,
  getInstagramConversation,
  getInstagramConversationByUser,
  getInstagramConversations,
  getInstagramConversationsByUser,
  getInstagramMedia,
  getInstagramMessage,
  getInstagramUser,
} from "./instagram/getters";
export { createInstagramPost, sendInstagramMessage } from "./instagram/setters";
export type {
  InstagramConversation,
  InstagramMedia,
  InstagramMessage,
  InstagramPostInput,
  InstagramPostMedia,
  InstagramUser,
} from "./instagram/types";
export { setupInstagramWebhook } from "./instagram/webhook";
export type { WaitForContainerOptions } from "./meta/container";
export type { GraphError } from "./meta/types";
export { getThread, getThreads, getThreadsReplies } from "./threads/getters";
export { createThread, createThreadsPost } from "./threads/setters";
export type {
  ThreadsPost,
  ThreadsPostInput,
  ThreadsPostMedia,
} from "./threads/types";
export { setupThreadsWebhook } from "./threads/webhook";
