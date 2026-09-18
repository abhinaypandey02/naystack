/**
 * Socials module: publish to and read from Instagram and Threads; read from YouTube.
 *
 * Each platform exposes one publishing method — {@link createInstagramPost},
 * {@link createThreadsPost} — that picks the right media type from what you pass.
 * The container/publish steps underneath are an implementation detail.
 *
 * Layout: `socials/meta/` is the Graph protocol Instagram and Threads share;
 * each platform gets its own folder. A platform on a different API brings its own
 * client and exposes its own `create<Platform>Post`.
 *
 * Reading is normalized where publishing is not. Every platform's OAuth, profile
 * and content endpoints collapse onto one {@link SocialProvider} shape — see
 * {@link InstagramProvider}, {@link YouTubeProvider} — so a consumer stores one row shape per connected
 * account whatever the platform. Publishing stays per-platform on purpose: the
 * inputs diverge too far (text-only posts, stories, carousels, reply controls)
 * for a shared signature to describe honestly.
 *
 * Anything this module doesn't wrap is still reachable: {@link getInstagramData}
 * and {@link getThreadsData} call the Graph API directly with the base URL and
 * version already pinned, so a one-off endpoint needs no new helper here.
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
  setupSocialAuth,
  type SetupSocialAuthOptions,
  type SocialConnection,
} from "./connect";
export { InstagramProvider } from "./instagram/adapter";
export {
  getInstagramAuthorizationURL,
  getLongLivedInstagramToken,
  type InstagramScope,
  refreshInstagramAccessToken,
} from "./instagram/auth";
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
export {
  createInstagramPost,
  replyToInstagramComment,
  sendInstagramMessage,
} from "./instagram/setters";
export type {
  InstagramConversation,
  InstagramMedia,
  InstagramMessage,
  InstagramPostInput,
  InstagramPostMedia,
  InstagramUser,
} from "./instagram/types";
export { getInstagramData } from "./instagram/utils";
export { setupInstagramWebhook } from "./instagram/webhook";
export type { RetryOptions, WaitForContainerOptions } from "./meta/container";
export type { GraphClient, GraphRequestOptions } from "./meta/request";
export { readGraphID } from "./meta/request";
export { type GraphError, type GraphParams, MetaMediaType } from "./meta/types";
export type { SocialProvider } from "./provider";
export { getThread, getThreads, getThreadsReplies } from "./threads/getters";
export { createThread, createThreadsPost } from "./threads/setters";
export type {
  ThreadsPost,
  ThreadsPostInput,
  ThreadsPostMedia,
} from "./threads/types";
export { getThreadsData } from "./threads/utils";
export { setupThreadsWebhook } from "./threads/webhook";
export type { PollOptions } from "./utils/poll";
export { pollUntilReady, withRetry } from "./utils/poll";
export { YouTubeProvider } from "./youtube/adapter";
export {
  exchangeYouTubeCode,
  getYouTubeAuthorizationURL,
  refreshYouTubeToken,
  type YouTubeScope,
} from "./youtube/auth";
export { getYouTubeChannel, getYouTubeUploads } from "./youtube/getters";
