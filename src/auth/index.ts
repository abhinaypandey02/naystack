/**
 * Auth module: how your users log in — email routes, Google OAuth, and token
 * helpers. Connecting a third-party social account to an already logged-in user
 * is a different concern and lives in `naystack/socials`.
 *
 * @example
 * ```ts
 * // Email auth
 * import { setupEmailAuth, getContext, checkAuthStatus, getRefreshToken } from "naystack/auth";
 *
 * // Google OAuth
 * import { setupGoogleAuth } from "naystack/auth";
 *
 * // Server-Component AuthWrapper (fetches the token during SSR)
 * import { AuthWrapper } from "naystack/auth";
 *
 * // End a custom login route the way the built-in ones do
 * import { getTokenizedResponse } from "naystack/auth";
 * ```
 *
 * @module
 */
export * from "./email";
export * from "./google";
export { getRefreshToken } from "./utils/token";
