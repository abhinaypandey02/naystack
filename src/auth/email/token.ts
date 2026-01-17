import { compare } from "bcryptjs";
import { JsonWebTokenError, sign, verify } from "jsonwebtoken";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

import { UserOutput } from "@/src/auth/types";
import { EnvVariable, getEnv } from "@/src/env";

import { REFRESH_COOKIE_NAME } from "../constants";

export function generateAccessToken(id: number, signingKey: string) {
  return sign({ id }, signingKey, {
    expiresIn: "2h",
  });
}

export function generateRefreshToken(id: number, refreshKey: string) {
  return sign({ id }, refreshKey);
}

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

export function verifyUser(user: UserOutput, password: string) {
  if (!user.password) return false;
  return compare(password, user.password);
}

export async function checkAuthStatus(redirectUnauthorizedURL?: string) {
  const Cookie = await cookies();
  const isAuthorized = !!Cookie.get(REFRESH_COOKIE_NAME)?.value;
  if (!isAuthorized && redirectUnauthorizedURL)
    return redirect(redirectUnauthorizedURL);
  return isAuthorized;
}
