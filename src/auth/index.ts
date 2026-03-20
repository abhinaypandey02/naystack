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
export * from "./email";
export * from "./google";
export * from "./instagram";
export { getRefreshToken } from "./utils/token";
