import { cookies } from "next/headers";

import { REFRESH_COOKIE_NAME } from "../constants";

/**
 * Reads the refresh token from cookies (server-side).
 * @returns The refresh token value or null
 */
export async function getRefreshToken() {
  const Cookie = await cookies();
  return Cookie.get(REFRESH_COOKIE_NAME)?.value || null;
}
