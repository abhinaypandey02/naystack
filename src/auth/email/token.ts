import { compare } from "bcryptjs";
import { JsonWebTokenError, sign, verify } from "jsonwebtoken";
import { NextResponse } from "next/server";

import { UserOutput } from "@/src/auth/types";

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
    response.cookies.set("refresh", "", {
      secure: false,
      httpOnly: true,
      expires: 0,
    });
  }
  if (refreshToken !== undefined) {
    response.cookies.set("refresh", refreshToken, {
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
  refreshKey: string,
  refreshToken?: string,
): number | null {
  if (refreshToken)
    try {
      const decoded = verify(refreshToken, refreshKey);
      if (typeof decoded !== "string" && typeof decoded.id === "number")
        return decoded.id;
    } catch (e) {
      if (!(e instanceof JsonWebTokenError)) console.error(e, "errors");
      return null;
    }
  return null;
}

export function getUserIdFromAccessToken(refreshToken?: string): number | null {
  if (refreshToken && process.env.SIGNING_KEY)
    try {
      const decoded = verify(refreshToken, process.env.SIGNING_KEY);
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
