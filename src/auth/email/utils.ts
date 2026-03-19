import { verify } from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";

import { getUserIdFromRefreshToken } from "@/src/auth/email/token";
import { EnvVariable, getEnv } from "@/src/env";
import { Context } from "@/src/graphql";

import { REFRESH_COOKIE_NAME } from "../constants";
import { handleError } from "../utils/errors";
import { SetupEmailAuthOptions } from "./types";

/**
 * Parses and validates the JSON body for sign-up/login routes: ensures `password` is present and,
 * if `TURNSTILE_KEY` is set, validates the Cloudflare Turnstile captcha.
 *
 * @param req - The NextRequest (body is read via `req.json()`).
 * @param options - Same `SetupEmailAuthOptions` passed to `setupEmailAuth`; used for `onError` when validation fails.
 * @returns Promise of either `{ error: NextResponse }` (validation failed) or `{ data: { password, ...rest } }` with the validated payload.
 * @category Auth
 */
export async function massageRequest(
  req: NextRequest,
  options: SetupEmailAuthOptions,
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
 * Verifies a Cloudflare Turnstile captcha token via the siteverify API.
 *
 * @param token - The response token from the Turnstile widget on the client.
 * @param secret - Your Turnstile secret key.
 * @returns `true` if verification succeeded, `false` otherwise.
 * @category Auth
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
 * Builds the auth context from a NextRequest: reads either the `Authorization: Bearer <token>` header
 * or the refresh cookie. Use this in REST API routes (outside GraphQL) to identify the current user.
 *
 * The GraphQL server uses this automatically — you typically only need it for custom REST endpoints.
 *
 * @param req - The NextRequest (headers and cookies are read).
 * @returns `Context` with `userId: number | null`. If the user was identified via the refresh cookie
 *   (not an access token), `isRefreshID` is set to `true`.
 *
 * @example
 * ```ts
 * import { getContext } from "naystack/auth";
 *
 * export const POST = async (req: NextRequest) => {
 *   const ctx = getContext(req);
 *   if (!ctx?.userId) return new NextResponse("Unauthorized", { status: 401 });
 *   // ctx.userId is the authenticated user's id
 * };
 * ```
 *
 * @category Auth
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
