import { verify } from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";

import { getUserIdFromRefreshToken } from "@/src/auth/email/token";
import { EnvVariable, getEnv } from "@/src/env";
import { Context } from "@/src/graphql";

import { REFRESH_COOKIE_NAME } from "../constants";
import { handleError } from "../utils/errors";
import { InitRoutesOptions } from "./types";

/**
 * Parses and validates the request body for auth routes (password, captcha).
 * @param req - Next.js request
 * @param options - Init routes options including error handler
 * @returns Either an error response or validated data with password
 */
export async function massageRequest(
  req: NextRequest,
  options: InitRoutesOptions,
): Promise<{
  error?: NextResponse;
  data?: { password: string } & {
    [key: string]: unknown; // extra fields must be type-checked
  };
}> {
  const data = (await req.json()) as {
    password?: string;
    captchaToken?: string;
  } & {
    [key: string]: unknown; // extra fields must be type-checked
  };

  if (!data.password)
    return {
      error: handleError(400, "Missing password", options.onError),
    };
  const turnstileKey = getEnv(EnvVariable.TURNSTILE_KEY, true);
  if (turnstileKey) {
    if (!data.captchaToken)
      return {
        error: handleError(400, "Missing captchaToken", options.onError),
      };
    if (!(await verifyCaptcha(data.captchaToken, turnstileKey)))
      return {
        error: handleError(400, "Invalid captcha", options.onError),
      };
  }
  return {
    data: {
      email: data.email!,
      password: data.password!,
      ...data,
    },
  };
}

/**
 * Verifies a Cloudflare Turnstile captcha token.
 * @param token - The captcha response token from the client
 * @param secret - Optional Turnstile secret key (uses env if omitted)
 * @returns True if verification succeeded
 */
export async function verifyCaptcha(token: string, secret?: string) {
  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        secret,
        response: token,
      }),
    },
  );
  if (res.ok) {
    const data = (await res.json()) as { success: boolean };
    return data.success;
  }
  return false;
}

/**
 * Extracts auth context from the request (Bearer token or refresh cookie).
 * @param req - Next.js request
 * @returns Context with userId (or null) and optional isRefreshID flag
 */
export const getContext = (req: NextRequest): Context => {
  const bearer = req.headers.get("authorization");
  if (!bearer) {
    const refresh = req.cookies.get(REFRESH_COOKIE_NAME)?.value;
    const userId = getUserIdFromRefreshToken(refresh);
    if (userId) return { userId: userId, isRefreshID: true };
    return { userId: null };
  }
  const token = bearer.slice(7);
  try {
    const res = verify(token, getEnv(EnvVariable.SIGNING_KEY));
    if (typeof res === "string") {
      return { userId: null };
    }
    return {
      userId: res.id as number,
    };
  } catch {}
  return { userId: null };
};
