import { getInstagramRoute } from "@/src/auth/instagram/route";
export { getRefreshedInstagramAccessToken, getInstagramAuthorizationURL } from "@/src/auth/instagram/utils";
import { InstagramUser } from "@/src/socials/instagram/types";

/**
 * Options for initializing Instagram OAuth via {@link setupInstagramAuth}.
 *
 * @property onUser - Called with `(instagramUser, appUserId, accessToken)` after successful OAuth. Return a string to show as error (redirects to `errorRedirectURL`); return `void` on success.
 * @property redirectURL - Where to redirect after successful Instagram auth.
 * @property errorRedirectURL - Where to redirect on error (with `?error=` query param).
 *
 * @category Auth
 */
export interface SetupInstagramAuthOptions {
  onUser: (
    data: InstagramUser,
    id: number | null,
    accessToken: string,
  ) => Promise<string | void>;
  redirectURL: string;
  errorRedirectURL: string;
}

/**
 * Initializes Instagram OAuth. Returns a GET handler for the OAuth callback and a helper to refresh long-lived tokens.
 *
 * Mount the GET handler on your Instagram auth route (e.g. `app/api/(auth)/instagram/route.ts`).
 *
 * The single GET handler serves both the OAuth callback (`?code`) and the connect
 * entry point (`?state` with no code → 302 to Instagram's authorize URL; see
 * {@link getInstagramAuthorizationURL} for why that URL is spelled the way it is).
 *
 * Requires env vars: `INSTAGRAM_CLIENT_ID` (server-only), `INSTAGRAM_CLIENT_SECRET`, `NEXT_PUBLIC_INSTAGRAM_AUTH_ENDPOINT`.
 *
 * @param props - Options. See {@link SetupInstagramAuthOptions}.
 * @returns Object with `GET` (route handler) and `getRefreshedAccessToken` (refreshes a long-lived token).
 *
 * @example
 * ```ts
 * // app/api/(auth)/instagram/route.ts
 * import { setupInstagramAuth } from "naystack/auth";
 *
 * export const { GET } = setupInstagramAuth({
 *   onUser: async (igUser, appUserId, accessToken) => {
 *     await saveInstagramUser(appUserId, igUser, accessToken);
 *   },
 *   redirectURL: "/dashboard",
 *   errorRedirectURL: "/login",
 * });
 * ```
 *
 * @category Auth
 */
export function setupInstagramAuth(props: SetupInstagramAuthOptions) {
  return {
    GET: getInstagramRoute(props),
  };
}
