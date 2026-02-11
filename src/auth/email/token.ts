import { compare } from "bcryptjs";
import { JsonWebTokenError, sign, verify } from "jsonwebtoken";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

import { UserOutput } from "@/src/auth/types";
import { EnvVariable, getEnv } from "@/src/env";

import { REFRESH_COOKIE_NAME } from "../constants";

/**
 * Generates a JWT access token for the user (2-hour expiry).
 * @param id - User id to encode in the JWT payload.
 * @param signingKey - Secret used to sign the token (typically `SIGNING_KEY` env var).
 * @returns Signed JWT string.
 * @category Auth
 */
export function generateAccessToken(id: number, signingKey: string) {
  return sign({ id }, signingKey, {
    expiresIn: "2h",
  });
}

/**
 * Generates a JWT refresh token for the user (no expiry — persisted in httpOnly cookie).
 * @param id - User id to encode in the JWT payload.
 * @param refreshKey - Secret used to sign the token (typically `REFRESH_KEY` env var).
 * @returns Signed JWT string.
 * @category Auth
 */
export function generateRefreshToken(id: number, refreshKey: string) {
  return sign({ id }, refreshKey);
}

/**
 * Builds a NextResponse with access/refresh tokens in the JSON body and sets the refresh cookie.
 *
 * - If `accessToken` is omitted, the refresh cookie is cleared (logout).
 * - If `refreshToken` is empty string, the cookie expires immediately (logout).
 * - If `refreshToken` is a valid string, the cookie is set for 1 year.
 *
 * @param accessToken - Optional access JWT to include in response body.
 * @param refreshToken - Optional refresh JWT to set as httpOnly cookie. Empty string clears the cookie.
 * @returns NextResponse with JSON body and Set-Cookie headers.
 * @category Auth
 */
export function getTokenizedResponse(
  accessToken?: string,
  refreshToken?: string,
) {
  const body = { accessToken, refreshToken };
  const response = NextResponse.json(body, {
    status: 200,
  });
  if (!accessToken) {
    response.cookies.set(REFRESH_COOKIE_NAME, "", {
      secure: false,
      httpOnly: true,
      expires: 0,
    });
  }
  if (refreshToken !== undefined) {
    response.cookies.set(REFRESH_COOKIE_NAME, refreshToken, {
      secure: false,
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
 * @param refreshToken - JWT access token string (parameter name is legacy).
 * @returns User id (number) or `null` if the token is invalid, expired, or missing.
 * @category Auth
 */
export function getUserIdFromAccessToken(refreshToken?: string): number | null {
  if (refreshToken)
    try {
      const decoded = verify(refreshToken, getEnv(EnvVariable.SIGNING_KEY));
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
