import { cookies } from "next/headers";

import { REFRESH_COOKIE_NAME } from "../constants";

/**
 * Reads the refresh token from cookies (server-side only). Use this in Server Components, layouts,
 * or Server Actions to check if the user is authenticated.
 *
 * @returns The refresh token string, or `null` if no refresh cookie is present.
 *
 * @example
 * ```ts
 * import { getRefreshToken } from "naystack/auth";
 * import { redirect } from "next/navigation";
 *
 * export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
 *   const token = await getRefreshToken();
 *   if (!token) return redirect("/login");
 *   return <div>{children}</div>;
 * }
 * ```
 *
 * @category Auth
 */
export async function getRefreshToken() {
  const Cookie = await cookies();
  return Cookie.get(REFRESH_COOKIE_NAME)?.value || null;
}
