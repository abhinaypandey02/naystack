import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getCorsHeaders, withCors } from "@/src/utils/route";

import { getDeleteRoute } from "./routes/delete";
import { getGetRoute } from "./routes/get";
import { getPostRoute } from "./routes/post";
import { getPutRoute } from "./routes/put";
import { SetupEmailAuthOptions } from "./types";
export { default as AuthFetch } from "./server";
export { checkAuthStatus } from "./token";
export { getContext } from "./utils";

/**
 * Returns Next.js route handlers for email auth. Mount them in your auth API route (e.g. `app/api/(auth)/email/route.ts`).
 *
 * The library automatically hashes passwords on sign-up and reads `SIGNING_KEY` / `REFRESH_KEY` from env vars.
 * Optionally supports Cloudflare Turnstile captcha validation when `TURNSTILE_KEY` is set.
 *
 * @param options - Configuration for the auth routes. See {@link SetupEmailAuthOptions}.
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
 * import { setupEmailAuth } from "naystack/auth";
 *
 * export const { GET, POST, PUT, DELETE } = setupEmailAuth({
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
export function setupEmailAuth(options: SetupEmailAuthOptions) {
  const { allowedOrigins } = options;
  return {
    GET: withCors(getGetRoute(options), allowedOrigins),
    POST: withCors(getPostRoute(options), allowedOrigins),
    PUT: withCors(getPutRoute(options), allowedOrigins),
    DELETE: withCors(getDeleteRoute(options), allowedOrigins),
    ...(allowedOrigins?.length
      ? {
          OPTIONS: (req: NextRequest) => {
            const corsHeaders = getCorsHeaders(
              req.headers.get("origin"),
              allowedOrigins,
            );
            return new NextResponse(null, {
              status: 204,
              headers: corsHeaders ?? undefined,
            });
          },
        }
      : {}),
  };
}
