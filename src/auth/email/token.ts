import { compare } from "bcryptjs";
import { JsonWebTokenError, sign, verify } from "jsonwebtoken";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

import { UserOutput } from "@/src/auth/types";
import { EnvVariable, getEnv } from "@/src/env";

import { REFRESH_COOKIE_NAME } from "../constants";

/**
 * Generates a JWT access token for the user (24-hour expiry).
 * @param id - User id to encode in the JWT payload.
 * @returns Signed JWT string.
 * @category Auth
 */
export function generateAccessToken(id: number) {
  return sign({ id }, getEnv(EnvVariable.SIGNING_KEY), {
    expiresIn: "24h",
  });
}

/**
 * Generates a JWT refresh token for the user (1-year expiry, matching the httpOnly cookie).
 * @param id - User id to encode in the JWT payload.
 * @returns Signed JWT string.
 * @category Auth
 */
export function generateRefreshToken(id: number) {
  return sign({ id }, getEnv(EnvVariable.REFRESH_KEY), {
    expiresIn: "365d",
  });
}

/**
 * Builds the response every auth route ends with: the access token as the
 * plain-text body, and the refresh token in an httpOnly cookie (1-year expiry).
 * With no `id`, the body is empty and the cookie is cleared — a logout.
 *
 * Exported so a custom login route (magic link, passkey, admin impersonation)
 * can end the same way the built-in ones do.
 *
 * @param id - The user to start a session for; omit to end one.
 * @returns NextResponse with the token body and Set-Cookie header.
 *
 * @example
 * ```ts
 * import { getTokenizedResponse } from "naystack/auth";
 *
 * export const POST = async (req: NextRequest) => {
 *   const userId = await verifyMagicLink(await req.json());
 *   if (!userId) return new NextResponse("Invalid link", { status: 400 });
 *   return getTokenizedResponse(userId);
 * };
 * ```
 * @category Auth
 */
export function getTokenizedResponse(
  id?: number
) {
  const accessToken = id ? generateAccessToken(id) : undefined;
  const refreshToken = id ? generateRefreshToken(id) : undefined;
  const response = new NextResponse(accessToken, {
    status: 200,
  });
  if (!accessToken) {
    response.cookies.set(REFRESH_COOKIE_NAME, "", {
      secure: true,
      httpOnly: true,
      expires: 0,
    });
  }
  if (refreshToken !== undefined) {
    response.cookies.set(REFRESH_COOKIE_NAME, refreshToken, {
      secure: true,
      httpOnly: true,
      expires:
        refreshToken === ""
          ? 0
          : new Date(Date.now() + 60 * 60 * 24 * 365 * 1000),
    });
  }
  return response;
}

/**
 * Decodes a refresh token and returns the user id from the JWT payload.
 * @param refreshToken - JWT refresh token string.
 * @returns User id (number) or `null` if the token is invalid, expired, or missing.
 * @category Auth
 */
export function getUserIdFromRefreshToken(
  refreshToken?: string,
): number | null {
  if (refreshToken)
    try {
      const decoded = verify(refreshToken, getEnv(EnvVariable.REFRESH_KEY));
      if (typeof decoded !== "string" && typeof decoded.id === "number")
        return decoded.id;
    } catch (e) {
      if (!(e instanceof JsonWebTokenError)) console.error(e, "errors");
      return null;
    }
  return null;
}

/**
 * Decodes an access token and returns the user id from the JWT payload.
 * @param accessToken - JWT access token string.
 * @returns User id (number) or `null` if the token is invalid, expired, or missing.
 * @category Auth
 */
export function getUserIdFromAccessToken(accessToken?: string): number | null {
  if (accessToken)
    try {
      const decoded = verify(accessToken, getEnv(EnvVariable.SIGNING_KEY));
      if (typeof decoded !== "string" && typeof decoded.id === "number")
        return decoded.id;
    } catch (e) {
      if (!(e instanceof JsonWebTokenError)) console.error(e, "errors");
      return null;
    }
  return null;
}

/**
 * Verifies a plain password against the user's stored bcrypt hash.
 * @param user - User object with `password` hash.
 * @param password - Plain-text password to verify.
 * @returns `true` if the password matches, `false` otherwise.
 * @category Auth
 */
export function verifyUser(user: UserOutput, password: string) {
  if (!user.password) return false;
  return compare(password, user.password);
}

/**
 * Checks if the current request has a valid refresh cookie. Optionally redirects to a URL if the user is not authorized.
 *
 * Use this in Server Components or layouts to gate access.
 *
 * @param redirectUnauthorizedURL - If set, redirects to this URL when the user is not authorized.
 * @returns `true` if authorized. If not authorized and `redirectUnauthorizedURL` is set, triggers a redirect (never returns).
 *
 * @example
 * ```ts
 * // In a Server Component:
 * import { checkAuthStatus } from "naystack/auth";
 * await checkAuthStatus("/login"); // Redirects to /login if not authenticated
 * ```
 *
 * @category Auth
 */
export async function checkAuthStatus(redirectUnauthorizedURL?: string) {
  const Cookie = await cookies();
  const isAuthorized = !!Cookie.get(REFRESH_COOKIE_NAME)?.value;
  if (!isAuthorized && redirectUnauthorizedURL)
    return redirect(redirectUnauthorizedURL);
  return isAuthorized;
}
