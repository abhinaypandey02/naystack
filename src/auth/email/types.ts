import { ErrorHandler, UserOutput } from "@/src/auth/types";

/**
 * Options for initializing email auth routes (GET/POST/PUT/DELETE) via `setupEmailAuth`.
 *
 * @property getUser - Fetches user by request data (e.g. `{ email }`); used for login and sign-up duplicate check. Must return a {@link UserOutput} or `undefined`.
 * @property createUser - Creates a new user with the hashed password; returns the created user as {@link UserOutput}.
 * @property onError - Optional custom handler for validation/auth errors; return a NextResponse to override default error responses.
 * @property onSignUp - Optional callback after successful sign-up. Receives `(userId, requestBody)`.
 * @property onLogin - Optional callback after successful login. Receives `(userId, requestBody)`.
 * @property onRefresh - Optional callback when GET refresh is used. Receives `(userId, requestBody)`.
 * @property onLogout - Optional callback when DELETE logout is used. Receives `(userId, requestBody)`.
 * @property allowedOrigins - Optional list of allowed CORS origins. If set, cross-origin requests from unlisted origins are rejected with 403.
 *
 * @example
 * ```ts
 * const options: SetupEmailAuthOptions = {
 *   getUser: async ({ email }) => db.query.users.findFirst({ where: eq(users.email, email) }),
 *   createUser: async (data) => (await db.insert(users).values(data).returning())[0],
 *   onSignUp: async (userId, body) => { console.log("New user:", userId); },
 * };
 * ```
 *
 * @category Auth
 */
export type SetupEmailAuthOptions = {
  getUser: (data: any) => Promise<UserOutput | undefined>;
  createUser: (user: any) => Promise<UserOutput | undefined>;
  onError?: ErrorHandler;
  onSignUp?: (userId: number | null, body: any) => Promise<void>;
  onLogin?: (userId: number | null, body: any) => Promise<void>;
  onRefresh?: (userId: number | null, body: any) => Promise<void>;
  onLogout?: (userId: number | null, body: any) => Promise<void>;
  allowedOrigins?: string[];
};
