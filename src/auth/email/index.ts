import { getDeleteRoute } from "./routes/delete";
import { getGetRoute } from "./routes/get";
import { getPostRoute } from "./routes/post";
import { getPutRoute } from "./routes/put";
import { InitRoutesOptions } from "./types";
export { checkAuthStatus } from "./token";
export { getContext } from "./utils";

/**
 * Returns Next.js route handlers for email auth. Mount them in your auth API route (e.g. `app/api/(auth)/email/route.ts`).
 *
 * The library automatically hashes passwords on sign-up and reads `SIGNING_KEY` / `REFRESH_KEY` from env vars.
 * Optionally supports Cloudflare Turnstile captcha validation when `TURNSTILE_KEY` is set.
 *
 * @param options - Configuration for the auth routes. See {@link InitRoutesOptions}.
 * @param options.getUser - Given request body (e.g. `{ email }`), returns the user from DB or undefined. Used for login and duplicate check on sign-up.
 * @param options.createUser - Given sign-up data with hashed password, inserts the user and returns the created record.
 * @param options.onError - Optional. Called on validation/auth errors; return a NextResponse to customize the error response.
 * @param options.onSignUp - Optional. Called after successful sign-up with `(userId, requestBody)`.
 * @param options.onLogin - Optional. Called after successful login with `(userId, requestBody)`.
 * @param options.onRefresh - Optional. Called when GET is used to refresh tokens with `(userId, requestBody)`.
 * @param options.onLogout - Optional. Called when DELETE is used to logout with `(userId, requestBody)`.
 * @returns Object with `GET` (refresh tokens), `POST` (sign up), `PUT` (login), `DELETE` (logout) — export as your route's handlers.
 *
 * @example
 * ```ts
 * // app/api/(auth)/email/route.ts
 * import { getEmailAuthRoutes } from "naystack/auth";
 *
 * export const { GET, POST, PUT, DELETE } = getEmailAuthRoutes({
 *   getUser: async ({ email }: { email: string }) => {
 *     const [user] = await db.select({ id: UserTable.id, password: UserTable.password })
 *       .from(UserTable).where(eq(UserTable.email, email));
 *     return user;
 *   },
 *   createUser: async (data) => {
 *     const [user] = await db.insert(UserTable).values(data)
 *       .returning({ id: UserTable.id, password: UserTable.password });
 *     return user;
 *   },
 *   onSignUp: async (userId, body) => {
 *     // Optional: run logic after sign-up (e.g. create an org)
 *   },
 * });
 * ```
 *
 * @category Auth
 */
export function getEmailAuthRoutes(options: InitRoutesOptions) {
  return {
    GET: getGetRoute(options),
    POST: getPostRoute(options),
    PUT: getPutRoute(options),
    DELETE: getDeleteRoute(options),
  };
}
