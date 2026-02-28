/**
 * Auth module: email routes, Google/Instagram OAuth, and token helpers.
 *
 * @example
 * ```ts
 * // Email auth
 * import { getEmailAuthRoutes, getContext, checkAuthStatus, getRefreshToken } from "naystack/auth";
 *
 * // Google OAuth
 * import { initGoogleAuth } from "naystack/auth";
 *
 * // Instagram OAuth
 * import { initInstagramAuth } from "naystack/auth";
 * ```
 *
 * @module
 */
export {
  AuthFetch,
  checkAuthStatus,
  getContext,
  getEmailAuthRoutes,
} from "./email";
export { initGoogleAuth } from "./google";
export {
  getRefreshedInstagramAccessToken,
  initInstagramAuth,
} from "./instagram";
export { getRefreshToken } from "./utils/token";
