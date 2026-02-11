/**
 * Socials module: Instagram and Threads API getters, setters, and webhook handlers.
 *
 * @example
 * ```ts
 * import { getInstagramUser, sendInstagramMessage, setupInstagramWebhook } from "naystack/socials";
 * import { getThreads, createThreadsPost, setupThreadsWebhook } from "naystack/socials";
 * ```
 *
 * @module
 */
export {
  getInstagramConversation,
  getInstagramConversationByUser,
  getInstagramConversations,
  getInstagramConversationsByUser,
  getInstagramMedia,
  getInstagramMessage,
  getInstagramUser,
} from "./instagram/getters";
export { sendInstagramMessage } from "./instagram/setters";
export { setupInstagramWebhook } from "./instagram/webhook";
export { getThread, getThreads, getThreadsReplies } from "./threads/getters";
export { createThread, createThreadsPost } from "./threads/setters";
export { setupThreadsWebhook } from "./threads/webhook";
