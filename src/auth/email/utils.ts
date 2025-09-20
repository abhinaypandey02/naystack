import { verify } from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";

import { getUserIdFromRefreshToken } from "@/src/auth/email/token";

import { handleError } from "../utils/errors";
import { InitRoutesOptions } from "./types";

export async function massageRequest(
  req: NextRequest,
  options: InitRoutesOptions,
): Promise<{
  error?: NextResponse;
  data?: { email: string; password: string } & {
    [key: string]: unknown; // extra fields must be type-checked
  };
}> {
  const data = (await req.json()) as {
    email?: string;
    password?: string;
    captchaToken?: string;
  } & {
    [key: string]: unknown; // extra fields must be type-checked
  };

  if (!data.email || !data.password)
    return {
      error: handleError(400, "Missing email or password", options.onError),
    };
  if (options.turnstileKey) {
    if (!data.captchaToken)
      return { error: handleError(400, "Missing captcha", options.onError) };
    if (!(await verifyCaptcha(data.captchaToken, options.turnstileKey)))
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

export const getUserContext = (
  refreshKey: string,
  signingKey: string,
  req: NextRequest,
): { refreshUserID?: number; accessUserId?: number } | null => {
  const bearer = req.headers.get("authorization");
  if (!bearer) {
    const refresh = req.cookies.get("refresh")?.value;
    const userId = getUserIdFromRefreshToken(refreshKey, refresh);
    if (userId) return { refreshUserID: userId };
    return null;
  }
  const token = bearer.slice(7);
  try {
    const res = verify(token, signingKey);
    if (typeof res === "string") {
      return null;
    }
    return {
      accessUserId: res.id as number,
    };
  } catch {}
  return null;
};
