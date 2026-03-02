import type { oauth2_v2 } from "googleapis";

import { getGoogleGetRoute } from "@/src/auth/google/get";

/** Google OAuth userinfo schema (from googleapis). */
type Schema$Userinfo = oauth2_v2.Schema$Userinfo;

/**
 * Options for initializing Google OAuth via {@link initGoogleAuth}.
 *
 * @property getUserIdFromEmail - Given Google userinfo (email, name, picture, etc.), resolves to your app's user id. Return `null` if the user should not be authenticated.
 * @property redirectURL - Where to redirect after successful Google auth (e.g. `"/dashboard"`).
 * @property errorRedirectURL - Optional; where to redirect on error. Defaults to `redirectURL` if omitted.
 *
 * @category Auth
 */
export interface InitGoogleAuthOptions {
  getUserIdFromEmail: (
    email: Schema$Userinfo,
    data?: string,
  ) => Promise<number | null>;
  redirectURL: string;
  errorRedirectURL?: string;
}

/**
 * Initializes Google OAuth. Returns a GET handler that initiates the OAuth flow (redirects to Google)
 * and handles the callback (exchanges code for tokens, calls `getUserIdFromEmail`, sets refresh cookie).
 *
 * Mount the GET handler on your Google auth route (e.g. `app/api/(auth)/google/route.ts`).
 *
 * Requires env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_GOOGLE_AUTH_ENDPOINT`.
 *
 * @param props - Options. See {@link InitGoogleAuthOptions}.
 * @returns Object with `GET` — export as your route's GET handler.
 *
 * @example
 * ```ts
 * // app/api/(auth)/google/route.ts
 * import { initGoogleAuth } from "naystack/auth";
 *
 * export const { GET } = initGoogleAuth({
 *   getUserIdFromEmail: async (googleUser) => {
 *     // Find or create user by Google email
 *     const user = await findOrCreateUserByEmail(googleUser.email!);
 *     return user?.id ?? null;
 *   },
 *   redirectURL: "/dashboard",
 *   errorRedirectURL: "/login",
 * });
 * ```
 *
 * @category Auth
 */
export function initGoogleAuth(props: InitGoogleAuthOptions) {
  return {
    GET: getGoogleGetRoute(props),
  };
}
