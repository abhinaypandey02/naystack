import { verify } from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { getUserIdFromRefreshToken } from "@/src/auth/email/token";
import { EnvVariable, getEnv } from "@/src/env";
import { Context } from "@/src/graphql";

import { REFRESH_COOKIE_NAME } from "../constants";
import { handleError } from "../utils/errors";
import { InitRoutesOptions } from "./types";

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

export async function logout(data?: object) {
  const Cookie = await cookies();
  Cookie.delete(REFRESH_COOKIE_NAME);
  await fetch(getEnv(EnvVariable.NEXT_PUBLIC_EMAIL_AUTH_ENDPOINT), {
    method: "DELETE",
    credentials: "include",
    body: JSON.stringify(data),
  });
}

export async function getCurrentRefreshToken() {
  const Cookie = await cookies();
  return Cookie.get(REFRESH_COOKIE_NAME)?.value;
}
