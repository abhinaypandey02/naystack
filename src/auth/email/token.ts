import { compare } from "bcryptjs";
import { JsonWebTokenError, sign, verify } from "jsonwebtoken";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

import { UserOutput } from "@/src/auth/types";
import { EnvVariable, getEnv } from "@/src/env";

import { REFRESH_COOKIE_NAME } from "../constants";

/**
 * Generates a JWT access token for the user.
 * @param id - User id to encode
 * @param signingKey - Secret used to sign the token
 * @returns Signed JWT string (2h expiry)
 */
export function generateAccessToken(id: number, signingKey: string) {
  return sign({ id }, signingKey, {
    expiresIn: "2h",
  });
}

/**
 * Generates a JWT refresh token for the user.
 * @param id - User id to encode
 * @param refreshKey - Secret used to sign the token
 * @returns Signed JWT string (no expiry)
 */
export function generateRefreshToken(id: number, refreshKey: string) {
  return sign({ id }, refreshKey);
}

/**
 * Builds a NextResponse with access/refresh tokens and sets the refresh cookie.
 * @param accessToken - Optional access JWT
 * @param refreshToken - Optional refresh JWT (empty string clears cookie)
 * @returns NextResponse with JSON body and cookie headers
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
 * Decodes the refresh token and returns the user id.
 * @param refreshToken - JWT refresh token string
 * @returns User id or null if invalid/missing
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
 * Decodes the access token and returns the user id.
 * @param refreshToken - JWT access token string (param name is legacy)
 * @returns User id or null if invalid/missing
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
 * Verifies a plain password against the user's hashed password.
 * @param user - User with password hash
 * @param password - Plain password to check
 * @returns True if password matches
 */
export function verifyUser(user: UserOutput, password: string) {
  if (!user.password) return false;
  return compare(password, user.password);
}

/**
 * Checks if the current request has a valid refresh cookie; optionally redirects if not.
 * @param redirectUnauthorizedURL - If set, redirects here when unauthorized
 * @returns True if authorized, or triggers redirect
 */
export async function checkAuthStatus(redirectUnauthorizedURL?: string) {
  const Cookie = await cookies();
  const isAuthorized = !!Cookie.get(REFRESH_COOKIE_NAME)?.value;
  if (!isAuthorized && redirectUnauthorizedURL)
    return redirect(redirectUnauthorizedURL);
  return isAuthorized;
}
