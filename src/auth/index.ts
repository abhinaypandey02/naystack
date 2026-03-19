/**
 * Auth module: email routes, Google/Instagram OAuth, and token helpers.
 *
 * @example
 * ```ts
 * // Email auth
 * import { setupEmailAuth, getContext, checkAuthStatus, getRefreshToken } from "naystack/auth";
 *
 * // Google OAuth
 * import { setupGoogleAuth } from "naystack/auth";
 *
 * // Instagram OAuth
 * import { setupInstagramAuth } from "naystack/auth";
 * ```
 *
 * @module
 */
export {
  AuthFetch,
  checkAuthStatus,
  getContext,
  setupEmailAuth,
} from "./email";
export { setupGoogleAuth } from "./google";
export {
  getRefreshedInstagramAccessToken,
  setupInstagramAuth,
} from "./instagram";
export { getRefreshToken } from "./utils/token";
